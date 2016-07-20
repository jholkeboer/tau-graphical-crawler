alert("hello?");
module.exports = function(){

	var htmlCode = function(level,totalLevels){
		if ( (level / totalLevels).toPrecision(3) < 0.5)
			return 255.toString(16)	+ "00" + (level / totalLevels).toPrecision(3) * 255).toString(16);
		else
			return (level / totalLevels).toPrecision(3) * 255).toString(16) + "00" + 255.toString(16);
	},

}
