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



d3.json("raw_shp/worldnoata.json", function(error, world) {
    if (error) return console.error(error);

    var countries = topojson.feature(world, world.objects.countries_noata);
    
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
        .scaleExtent([0.1, 2 * height])
        .on("zoom", zoomHandler);

    function zoomHandler() {

        // FIND A WAY TO SMOOTH THIS
        projection.translate(d3.event.translate)
            .scale(d3.event.scale);

        // Include paths in zoom action
        svg.selectAll("path")
            .attr("d", path);

        // Include labels in zoom action
        svg.selectAll("text")
            .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; });
    };


    // Create the SVG
    var svg = d3.select("#map")
            .append("svg")
            .attr("height", height)
            .attr("width", width)
            .call(zoom);

    // Data binding for country borders
    var gMap = svg.append("g");

    gMap.selectAll("path")  // Fuck this shit. I can't explain this. See: http://bost.ocks.org/mike/join/, http://www.macwright.org/presentations/dcjq/
        .data(countries.features)
        .enter()
        .append("path")
        .attr("id", function(d) { return d.id; })
        .attr("d", path)
        .attr("stroke", "white")
        .attr("stroke-width", 0.5 + "px")
        .on("click", clickAction);
        
   
    // Data binding for places
    var gPlaces = svg.append("g");
    var places = topojson.feature(world, world.objects.places_noata)

    path.pointRadius([2]); // Setting point size 

    // Show places only if the detail checkbox is checked
    // Unchecks the detail checkbox (WHY IS IT CHECKED BY DEFAULT?)
    d3.select("#checkbox-detail").property('checked', false).on("change", function() {
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
                .attr("class", function(d) { return "place " + d.properties.sov_a3 + "-" + d.properties.name; });
                    
            // Add city names 
            gPlaces.selectAll(".place-label")
                .data(places.features)
                .enter()
                .append("text")
                .attr("class", function(d) { return "place-label " + d.properties.sov_a3 + "-" + d.properties.name; }) // To fix duplicate names
                .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; }) // ** SOME VALUES NaN
                .style("opacity", 0)
                .attr("dy", ".35em")
                .attr("x", function(d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
                .style("text-anchor", function(d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; })
                .text(function(d) { return d.properties.name; });

            // Set hover property on cities
            gPlaces.selectAll("path")
                .on("mouseover", function(d) {
                    var cityText = d3.selectAll("text." + d.properties.sov_a3 + "-" + d.properties.name);
                    cityText.transition()
                        .duration(250)
                        .style("opacity", 1);
                })
                .on("mouseout", function(d) {
                    var cityText = d3.selectAll("text." + d.properties.sov_a3 + "-" + d.properties.name);
                    cityText.transition()
                        .duration(250)
                        .style("opacity", 0);
                });


        } else {

            gMap.selectAll(".country-label")
                .remove();

            gPlaces.selectAll("path")
                .remove();

            gPlaces.selectAll(".place-label")
                .remove();
         }
    });


   /* 
    
    RUS Merge: Solved by using map units instead of subunits

    var merger = d3.set(["RUS"]);
    svg.append("path")
        .datum(topojson.merge(world, world.objects.countries.geometries.filter(function(d) { return merger.has(d.id); })))
        .attr("d", path)
        .attr("class", "never-visited")
        .attr("stroke", "white")
        .attr("stroke-width", 0.3 + "px")
        .on("click", clickAction);

    */


});


function clickAction() {

    var sidebarSelection = d3.select('input[name="sidebar-options"]:checked').node().value;
    // Select action
    // TO BE IMPLEMENTED

    // Change class based on selection on radio button

    switch (sidebarSelection) {
        case 'colour':
            colourSelect.call(this);
            break;
        case 'reset':
            resetSelect.call(this);
            break;
        case 'pin':
            pinSelect.call(this);
            break;
    };
    
};

function colourSelect() {
    var colourSelection = d3.select('input[name="travel-status"]:checked').node().value;
    var selection = d3.select(this);
    var classOptions = ['never-visited', 'will-visit', 'visited']

    for (var i = 0; i < classOptions.length; i++) {

        var currentClass = classOptions[i];

        if (!selection.classed(colourSelection)) {
            selection.classed(currentClass, false);
        };
    };

    selection.classed(colourSelection, !selection.classed(colourSelection));
};


function resetSelect() {

}


function pinSelect() {

}

console.log(d3.select('input[id="checkbox-detail"]').property('checked', true))