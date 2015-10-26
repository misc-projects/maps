d3.json("raw_shp/worldnoa.json", function(error, world) {
    if (error) return console.error(error);

    var width = $("#map").width(),
        height = $(window).height();  // get a better method for this

    var svg = d3.select("#map")
            .append("svg")
            .attr("height", height)
            .attr("width", width);

    // Create unit projection
    var projection = d3.geo.mercator()
                    .scale(1)
                    .translate([0, 0]); 
                    
    var path = d3.geo.path()
            .projection(projection);

    var countries = topojson.feature(world, world.objects.countries_noata);
    
    // Derive scale and offset translation from bounds

    var bounds  = path.bounds(countries),
        left = bounds[0][0],
        right = bounds[1][0],
        top = bounds[1][1],
        bottom = bounds[0][1],
        scale = 0.95 / Math.max((right - left) / width, (top - bottom) / height),
        offset = [(right - left) * scale / 2, (height - scale * (top + bottom)) / 2];

    console.log("bounds " + bounds[1][1] + " " + bounds[1][0] + " " + bounds[0][1] + " " + bounds[0][0])
    console.log(scale)
    console.log(offset)

    projection = d3.geo.mercator()
                .translate(offset)
                .scale(scale)
                .rotate([-10, 0, 0]) // Solves the separation of Russia              

    path = path.projection(projection);

    svg.selectAll("path")  // Fuck this shit. http://bost.ocks.org/mike/join/, http://www.macwright.org/presentations/dcjq/
        .data(countries.features)
        .enter()
        .append("path")
        .attr("id", function(d) { return d.id; })
        .attr("d", path)
        .attr("class", "never-visited")
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


var clickAction = function() {

    // change class
    // zoom

    var selection = d3.select(this)
    selection.classed("visited", !selection.classed("visited"));

    // find a way to remove the other class

    // closure?
};