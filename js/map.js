// Set global variables outside of the d3.json scope because d3 is asynchronous

var width = d3.select("#map")
            .node()
            .getBoundingClientRect()
            .width;
    height = d3.select("#map")
            .node()
            .getBoundingClientRect()
            .height;

// Create unit projection
var projection = d3.geo.mercator()
                .scale(1)
                .translate([0, 0]); 
                    
var path = d3.geo.path()
        .projection(projection);


d3.json("raw_shp/world.json", function(error, world) {
    if (error) return console.error(error);

    var countries = topojson.feature(world, world.objects.countries);
    
    // Derive scale and offset translation from unit bounds
    var bounds  = path.bounds(countries),
        left = bounds[0][0],
        right = bounds[1][0],
        top = bounds[1][1],
        bottom = bounds[0][1],
        scale = 0.95 / Math.max((right - left) / width, (top - bottom) / height),
        offset = [(right - left) * scale / 2, (height - scale * (top + bottom)) / 2];

    projection = d3.geo.mercator()
                .translate(offset)
                .scale(scale)
                .rotate([-10, 0, 0]) // Solves the discontinuity of Russia              

    path = path.projection(projection);

    // Create zoom behavior
    var zoom = d3.behavior.zoom()
        .translate(projection.translate())
        .scale(projection.scale())
        .scaleExtent([1, 2 * height])
        .on("zoom", zoomProjection);

    /* NOTES ON PROJECTION 

        For zoom functionality, zooming the svg instead of projection would be faster, but 
        it will also zoom the labels.

        The current implementation recalculates the projection, but it is slower.

            To implement SVG zooming:
            - uncomment the zoomSVG function below and replace the zoomProjection in the behaviour
            - comment out the projection translations in the zoom behaviour
            - reset svg translations and scale needs to be changed

        function zoomSVG() {
            g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }  */

    function zoomProjection() {

        // Zoom projection
        projection.translate(d3.event.translate)
            .scale(d3.event.scale);

        // Including paths in zoom action
        svg.selectAll("path")
            .attr("d", path);

        // Zooming points?
        // path.pointRadius(d3.event.scale / 100);

        // Including labels in zoom action
        svg.selectAll("text")
            .attr("transform", function(d) { 
                return "translate(" + path.centroid(d) + ")"; });

    };

    // Reset zoom on reset button press
    d3.select("#reset-zoom").on("click", function() {

        /* For zoomSVG, uncomment this:
        svg.transition()
            .duration(1000)
            .call(zoom.translate(offset).scale(scale).event);
            */


            projection.translate(offset)
                .scale(scale);

            // Resetting zoom event scale
            zoom.scale(scale);
            zoom.translate(offset);

            svg.selectAll("path")
                .attr("d", path);

            svg.selectAll("text")
                .attr("transform", function(d) { 
                    return "translate(" + path.centroid(d) + ")"; });

    });


    // Create the SVG and containing group
    var svg = d3.select("#map")
            .append("svg")
            .attr("height", height)
            .attr("width", width)
            .call(zoom);
    var g = svg.append("g");

    // Data binding for country borders
    var gMap = g.append("g");

    gMap.selectAll("path")  // Fuck this shit. I can't explain this. See: http://bost.ocks.org/mike/join/, http://www.macwright.org/presentations/dcjq/
        .data(countries.features)
        .enter()
        .append("path")
        .attr("id", function(d) { return d.id; })
        .attr("d", path)
        .attr("stroke", "white")
        .attr("stroke-width", 0.8 + "px")
        .attr("class", "country-path")
        .on("click", clickAction);
        
    // Data binding for places
    var gPlaces = g.append("g");
    var places = topojson.feature(world, world.objects.places_noata)

    // Setting point size 
    /* NOTE ON OBJECT TYPES: 
        pins: "Points"
        city dots: "Features"

        This will preferrably be changed
    */
    path.pointRadius(function(d) { 
        if (d.type == "Point") {
            return 5;
        } else {
            return 2; 
        }
    });

    // Show places only if the detail checkbox is checked
    var detailCheckbox = d3.select("#checkbox-detail");

    detailCheckbox.on("change", function() {
        toggleCheckbox.call(this);
    });

    function toggleCheckbox() {
        if (this.checked) {
            // ** ADD FILTERS (COUNTRY OR CITY)
            // Load country names
            gMap.selectAll(".country-label")
                .data(countries.features)
                .enter()
                .append("text")
                .attr("class", function(d) { return "country-label " + d.id; })
                .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
                .style("text-anchor", "middle")
                .style("opacity", 0)
                .text(function(d) { return d.properties.name; });

            // Set hover property on country names
            gMap.selectAll("path")
                .on("mouseover", function(d) {
                    var countryText = d3.selectAll("." + d.id);
                    countryText.transition()
                        .duration(250)
                        .style("opacity", 1);
                })
                .on("mouseout", function(d) {
                    var countryText = d3.selectAll("." + d.id);
                    countryText.transition()
                        .duration(250)
                        .style("opacity", 0);
                });

            // Add city dots
            gPlaces.selectAll("path")
                .data(places.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("class", function(d) { return "place " 
                    + d.properties.sov_a3 + "-" 
                    + d.properties.name
                    .toLowerCase()
                    .replace(/[^\w]/g,"");}); // Fixes some names not appearing (deletes whitespace)
            
            // ** ISSUE: CITY DOTS AND NAMES MUST HAVE SAME SOV_A3-NAME CLASS

            // Add city names 
            gPlaces.selectAll(".place-label")
                .data(places.features)
                .enter()
                .append("text")
                .attr("class", function(d) { return "place-label " 
                    + d.properties.sov_a3 + "-" 
                    + d.properties.name
                    .toLowerCase()
                    .replace(/[^\w]/g,""); }) // To fix duplicate names
                .attr("transform", function(d) { 
                    return "translate(" + path.centroid(d) + ")"; })
                .style("opacity", 0)
                .attr("dy", ".35em")
                .attr("x", function(d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
                .style("text-anchor", function(d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; })
                .text(function(d) { return d.properties.name; });

            // Set hover property on cities
            gPlaces.selectAll("path")
                .on("mouseover", function(d) {
                    var cityText = d3.selectAll("text." 
                        + d.properties.sov_a3 + "-" 
                        + d.properties.name
                        .toLowerCase()
                        .replace(/[^\w]/g,""));
                    cityText.transition()
                        .duration(250)
                        .style("opacity", 1);
                })
                .on("mouseout", function(d) {
                    var cityText = d3.selectAll("text." 
                        + d.properties.sov_a3 + "-" 
                        + d.properties.name
                        .toLowerCase()
                        .replace(/[^\w]/g,""));
                    cityText.transition()
                        .duration(250)
                        .style("opacity", 0);
                });


        } else {

            // Removes labels when 'Show Detail' is unselected
            clearLabels()

         }
    };
 
    function clearLabels() {
        gMap.selectAll(".country-label")
            .remove();

        gPlaces.selectAll("path")
            .remove();

        gPlaces.selectAll(".place-label")
            .remove();
    }

    function clearCountryFills() {
        gMap.selectAll("path.country-path")
            .classed("visited", false)
            .classed("will-visit", false);
    }

    function clickAction() {
        var sidebarSelection = d3.select('input[name="sidebar-options"]:checked').node().value;
        // Select action
        // **TO BE IMPLEMENTED
        // Change class based on selection on radio button

        switch (sidebarSelection) {
            case 'visit':
                visitSelect.call(this);
                break;
            case 'pin':
                pinSelect.call(this);
                break;
            case 'colour':
                colourSelect.call(this);
                break;
        };    
    };

    // Changes the class for a polygon based on visit status
    function visitSelect() {
        var visitSelection = d3.select('input[name="travel-status"]:checked').node().value;
        var selection = d3.select(this);
        var classOptions = ['never-visited', 'will-visit', 'visited']

        for (var i = 0; i < classOptions.length; i++) {

            var currentClass = classOptions[i];

            if (!selection.classed(visitSelection)) {
                selection.classed(currentClass, false);
            };
        };
        selection.classed(visitSelection, !selection.classed(visitSelection));
    };

    // Create new SVG group for pins
    var gPin = g.append("g");
    var circle = d3.geo.circle();

    // Add pins to map
    function pinSelect() {
        var coordinates = d3.mouse(this);
        var mapCoor = projection.invert(coordinates)

        /*
        gPin.append("circle")
            .attr("cx", coordinates[0])
            .attr("cy", coordinates[1])
            .attr("r", 5)
            .style("fill", "red");
        
        */

        gPin.append("path")
            .datum({type: "Point", coordinates: mapCoor})
            .attr("class", "pin")
            .attr("d", path)
            .attr("stroke-width", 2 + "px")
            .attr("stroke", "blue")
            .attr("pointer-events", "all")
            .style("fill", "none")
            .append("svg:title") // Hover to show latlong
            .text("lat: " + mapCoor[0].toFixed(2) 
                + "\nlong: " + mapCoor[1].toFixed(2));       
    };
});

// Colours countries in the map based on .colour-input radio buttons
function colourSelect() {
    var selectedColour = d3.select(".colour-input:checked").node().value;
    var selection = d3.select(this);

    selection
        .style("fill", selectedColour);   
}

// Dynamic HTML to add colour selection palette
function appendPalette() {
    var paletteMenu = d3.select("#colour-bar .sidebar-banner")
    var colourSelection = ["#EF9EA3", "#C795BF", "#92B0DB", "#A1E09A", "#FEF59D", "#F9CB8D", "#F19D7F"]

    paletteMenu.selectAll(".colour-input")
        .data(colourSelection)
        .enter()
        .append("div")
            .attr("class", "colour")
        .append("label")
            .attr("for", function(d, i) { return "colour-button" + (i + 1); })
            .attr("class", "colour")
            .attr("id", function(d, i) { return "colour" + (i + 1); })
            .style("background-colour", function(d) { return d; })
            .text(" ")
        .append("input")
            .attr("type", "radio")
            .attr("id", function(d, i) { return "colour-button" + (i + 1) ; })
            .attr("value", function(d) { return d; })
            .attr("name", "colour-input")
            .attr("class", "colour-input")
    
    paletteMenu.selectAll("label.colour")
        .append("div")
        .attr("class", "colour-selected");

    paletteMenu.selectAll("label.colour")
        .append("div")
        .attr("class", "colour-unselected");
}

appendPalette();