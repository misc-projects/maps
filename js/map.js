d3.json("raw_shp/worldnoa.json", function(error, world) {
    if (error) return console.error(error);

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

        svg.selectAll("path")
            .attr("d", path);
    };


    // Create the SVG
    var svg = d3.select("#map")
            .append("svg")
            .attr("height", height)
            .attr("width", width)
            .call(zoom);


    // Data binding
    svg.selectAll("path")  // Fuck this shit. I can't explain this. See: http://bost.ocks.org/mike/join/, http://www.macwright.org/presentations/dcjq/
        .data(countries.features)
        .enter()
        .append("path")
        .attr("id", function(d) { return d.id; })
        .attr("d", path)
        .attr("stroke", "white")
        .attr("stroke-width", 0.3 + "px")
        .on("click", clickAction);
   

    
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