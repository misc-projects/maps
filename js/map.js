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
        offset = [width / 2, (height - scale * (top + bottom)) / 2]; // center SVG horizontally 

        //offset = [(right - left) * scale / 2, (height - scale * (top + bottom)) / 2]; // align SVG left

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
        it will also zoom the pins and labels.

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

        // Include images
        svg.selectAll("image")
            .attr("x", function(d,i) {return projection(d.coordinates)[0] - 10;})
            .attr("y", function(d,i) {return projection(d.coordinates)[1] - 20;})


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

            svg.selectAll("image")
                .attr("x", function(d,i) {return projection(d.coordinates)[0] - 10;})
                .attr("y", function(d,i) {return projection(d.coordinates)[1] - 20;})

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
        .on("click", pathClick);
        
    // Data binding for places
    var gPlaces = g.append("g");
    var places = topojson.feature(world, world.objects.places_noata)

    // Setting point size 
    path.pointRadius(2);

    // Show places only if the detail checkbox is checked
    d3.select("#checkbox-detail").on("change", function() {
        toggleCheckbox.call(this);
    });

    function toggleCheckbox() {
        if (!this.checked) {
            // Removes labels when 'Show Detail' is unselected
            d3.select("#country-name").property("checked", false);
            d3.select("#city-name").property("checked", false);
            clearLabels()
         };
    };

    d3.select("#country-name").on("change", function() {
        showCountryNames.call(this);
    });

    function showCountryNames() {
        console.log(this)
        if (this.checked) {
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

            } else {
                gMap.selectAll(".country-label")
                    .remove();
        };
    };

    d3.select("#city-name").on("change", function() {
        showCities.call(this);
    });

    function showCities() {
        if (this.checked) {
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
                    .replace(/[^\w]/g,"");}); // Fixes some names not appearing (deletes everything but letters)
            
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

            gPlaces.selectAll("path")
                .remove();

            gPlaces.selectAll(".place-label")
                .remove();
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

    // Select action upon path click
    function pathClick() {
        var sidebarSelection = d3.select('input[name="sidebar-options"]:checked').node().value;
        
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

    var visitStatus = { "never-visited" : [],
                        "will-visit" : [],
                        "visited" : [] };

    // Changes the class for a polygon based on visit status
    function visitSelect() {
        var visitSelection = d3.select('input[name="travel-status"]:checked').node().value,
            selection = d3.select(this),
            countryName = selection.datum().properties.name,
            classOptions = ['never-visited', 'will-visit', 'visited'],
            classIndex = classOptions.indexOf(visitSelection);

        for (var i = 0; i < classOptions.length; i++) {

            var currentClass = classOptions[i];

            // Gets rid of all other classes
            if (visitSelection != currentClass) {
                selection.classed(currentClass, false);
            };

        };

        
        // Update visit lists ** consider refactoring
        function updateList() {

            if (!selection.classed(visitSelection)) {
                addToList(countryName, classIndex);
                removeFromList(countryName, (classIndex + 1) % 3);
                removeFromList(countryName, (classIndex + 2) % 3);
            } else {
                removeFromList(countryName, classIndex);
           }
            
            selection.classed(visitSelection, !selection.classed(visitSelection));

            function addToList(countryName, classIndex) {
                visitStatus[classOptions[classIndex]].push(countryName);
                updateBoard(classOptions[classIndex], countryName);
            }

            function removeFromList(countryName, classIndex) {
                var i = visitStatus[classOptions[classIndex]].indexOf(countryName);
                if (i !== -1) {
                    visitStatus[classOptions[classIndex]].splice(i, 1)
                };
                updateBoard(classOptions[classIndex], countryName);
            }

            // Display boards
            function updateBoard(visitClass, clickCountryName) {
                d3.select("#" + visitClass + "-board")
                    .select("p")
                    .html(function() {
                        var countryArr = visitStatus[visitClass].sort()
                        var display = ""
                        for (var i = 0; i < countryArr.length; i++) {

                            console.log(countryArr[i] + " " + clickCountryName)
                            if (countryArr[i] == clickCountryName) {
                                display = display + "<span class='new-entry'>"
                                        + countryArr[i] + "</span> <br />"
                            } else {
                                display = display + countryArr[i] + "<br />"
                            }
                        };
                        
                        return display;
                    })
                    .select(".new-entry")
                        .style("opacity", 0)
                    
                d3.select("#" + visitClass + "-board")
                    .select(".new-entry")
                        .transition()
                        .duration(350)
                        .style("opacity", 1);

            };
        
        }

        updateList();


    };




    // Create new SVG group for pins
    var gPin = g.append("g");

    // Add pins to map
    function pinSelect() {
        var coordinates = d3.mouse(this);
        var mapCoor = projection.invert(coordinates)

        if (d3.select('input[name="pin-toggle"]:checked').node().value == 'pin-on') {

            gPin.selectAll(".pins")
                .data([{coordinates: mapCoor}])
                .enter()
                    .append("image")
                    .attr("xlink:href", "images/marker.png")
                    .attr("x", function(d, i) { return projection(d.coordinates)[0] - 10; }) // Offset image so cursor at point
                    .attr("y", function(d, i) { return projection(d.coordinates)[1] - 20; })
                    .attr("width", "20")
                    .attr("height", "20")
                    .attr("class", "marker")
                    .append("svg:title") // Hover to show latlong
                    .text("lat: " + mapCoor[0].toFixed(2) 
                        + "\nlong: " + mapCoor[1].toFixed(2)); 
                };

        // Remove pins when clicked
        gPin.selectAll("image.marker").on("click", function() {
            if (d3.select('input[name="pin-toggle"]:checked').node().value == 'pin-off') {
                d3.select(this).remove();
            }
        });
    };

    // Clear button
    d3.select("#clear-button").on("click", function() {
        d3.selectAll("path.country-path")
            .style("fill", null)
            .classed("visited", false)
            .classed("will-visit", false);

        d3.selectAll("image")
            .remove();

        d3.selectAll("input").property("checked", false);

        clearLabels();
    });
});

// Colours countries in the map based on .colour-input radio buttons
function colourSelect() {
    var selectedColour = d3.select(".colour-input:checked").node().value;
    var selection = d3.select(this);

    if (getHex(selection.style("fill")) != selectedColour) {
        selection
            .style("fill", selectedColour);   
    } else {
        selection
            .style("fill", null);
    };

    function getHex(rgb) {
        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        };

        return ("#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3])).toUpperCase();
    };
    
};

// Dynamic HTML to add colour selection palette
function appendPalette() {
    var paletteMenu = d3.select("#colour-bar .sidebar-banner")
    var colourSelection = ["#EF9EA3", "#C795BF", "#92B0DB", "#88EEFA", 
                            "#A1E09A", "#FEF59D", "#F9CB8D", "#F19D7F"]

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




