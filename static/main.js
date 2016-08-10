/*function nodeColors(levels){
	var partition = (510 / (levels)).toPrecision(3);
	var colors = []
	for (var i = 0 ; i < levels+1 ; i++){
		var n = partition * i;
		var r = (n <= 255) ? 255 : 510 - n;
		var b = (n <= 255) ? n : 255; 
		colors.push({"r":r,"g":0,"b":b});
	}
	return colors;
}*/

function getCookie(){
		var ca = unescape(document.cookie).split(';');
		if (ca.length == 3){
			return [ca[0].split("=====")[1], ca[1].split("=====")[1], ca[2].split("=====")[1]];
		} else if (ca.length >= 4){
			return [ca[0].split("=====")[1], ca[1].split("=====")[1], ca[2].split("=====")[1],ca[3].split("=====")[1]];
		} else {
			return "";
		}
}

(function($){

	// declare branches shown/hidden
	var shown = {nodes:{},edges:{}};
	var hidden = {nodes:{},edges:{}}; 
	// queue to track which key was last plotted
	var keys = [];
	var rootKey, noEdges;
	var search = 0;

	var searchForKeyword = function(ps){

		search += 1;
		var startingURL = document.getElementById("starting-url").value;
		var recursionLimit = document.getElementById("recursion-limit").value;
		var searchElement = document.getElementById("search-type");
		var searchType = searchElement.options[searchElement.selectedIndex].value;
		var word = document.getElementById("keyword-search").value.toLowerCase();
		setCookie(startingURL, recursionLimit, searchType, word);

		ps.data.eachNode(function(node,pt){
			node.data.color = "normal";
			var title = (typeof node.data.name === "undefined") ? "" : node.data.name.toLowerCase();
			var link = node.name.toLowerCase();
			if (link.indexOf(word) != -1 || title.indexOf(word) != -1){
				node.data.color = "fuchsia";
			}
		});

	}

	var clearCookie = function(){
		document.cookie = "";
	}

	var setCookie = function(url,recursionLimit,type,keyword){
		var cString = "url=====" + url +";recursionLimit=====" + recursionLimit + ";type=====" + type + ";keyword=====" + keyword + ";";
		document.cookie = escape(cString);
	}

 	var addObj = function(ps,obj,numEdges){
 		// counter for numEdges
		var c = 0;
		// find edges to plot onto graph
		while( c < numEdges && keys.length != 0){
			// get key first element from queue
			var key = keys[0];
			try{
				keys = keys.concat(Object.keys(obj.edges[key]));
			} catch(e){console.log("no more nodes to add!");}
			
			shown.edges[key]= (typeof shown.edges[key] == "undefined") ? {} : shown.edges[key];
			try{
				shown.nodes[key] = (typeof shown.nodes[key] == "undefined") ? JSON.parse(JSON.stringify(obj.nodes[key])) : shown.nodes[key];
			} catch(e){console.log("no more nodes to add!");}

			for ( var child in obj.edges[key] ){
				if (obj.edges[key].hasOwnProperty(child)){
					c += 1;
					shown.edges[key][child] = JSON.parse(JSON.stringify(obj.edges[key][child]));
					delete hidden.edges[key][child];
					try{
						shown.nodes[child] = JSON.parse(JSON.stringify(obj.nodes[child]));
					}catch(e){}

				}

				// Exit if numEdges desired to be shown is met
				if (c >= numEdges) break;
			}

			// Trim dangling edges
			if ($.isEmptyObject(hidden.edges[key])){
				delete hidden.edges[key];
				keys.shift();
				//break;
			}
		}

		// plot graph onto screen
		ps.data.merge(shown);

		// track state of graph
		return [shown,hidden,keys,ps];
	}

 	var clearCanvas = function(ps){
		ps.data.eachNode(function(node,pt){
			ps.data.pruneNode(node);
		});
	}

	function generateJobID(length) {
		var characters = "qwertyuiopasdfghjklzxcvbnm1234567890";
		var output = "";
		for (var i = 0; i < length; i++) {
			output += characters[parseInt((Math.random() * characters.length))];
		}
		return output;
	}

	function statusChecker(jobID) {
		$.ajax({
			url: "/status_update",
			type: "POST",
			data: {
				"jobID": jobID
			},
			jobID: jobID,
			success: function(results) {
				var res = JSON.parse(results);
				console.log(res);

				var new_results = res.result;
				console.log("link count");
				console.log(new_results.length)

				var partialResults = document.getElementById("partial-results");
				var urlHTML = '';
				if (res.done != true) {
					if (new_results.length > 0) {
						var urlStrings = new_results.reduce(
							function(prev, next) {
								return next["child"] + "<br>" + prev;
							}
						)
						partialResults.innerHTML = urlStrings + partialResults.innerHTML;
					}
				}

				if (res.done != true) {
					var waitToRequest = function(job) {
						setTimeout(function() {statusChecker(job)}, 3000);
					}
					waitToRequest(this.jobID);
				} 

			},
			error: function(jqXHR, stats, errThrown) {
				console.log("Status update error")
			}
		});
	}

	var submitCrawl = function(ps){
		clearCanvas(ps);
		var startingURL = document.getElementById("starting-url").value;
		var recursionLimit = document.getElementById("recursion-limit").value;
		var searchElement = document.getElementById("search-type");
		var searchType = searchElement.options[searchElement.selectedIndex].value;
		var crawlButton = document.getElementById("submit-crawl");
		var keywordSearch = document.getElementById("keyword-search").value;
		crawlButton.disabled = true;
		crawlButton.innerHTML = "Please wait, loading...";
		document.getElementById("starting-url").disabled = true;
		document.getElementById("recursion-limit").disabled = true;
		searchElement.disabled = true;
		setCookie(startingURL, recursionLimit, searchType, keywordSearch);

		var jobID = generateJobID(25);

		$.ajax({
			url: "/start_crawl",
			type: "POST",
			data: {
				"startingURL": startingURL,
				"recursionLimit": recursionLimit,
				"searchType": searchType,
				"keyword": keywordSearch,
				"jobID": jobID
			},
			success: function(result) {
				shown = {nodes:{},edges:{}};
				hidden = {nodes:{},edges:{}};
				var crawlerResults = JSON.parse(result).result;
				rootKey = Object.keys(crawlerResults.nodes).filter(function(value, index, array){
					return crawlerResults.nodes[value].level == 1;
				})[0];
				keys.push(rootKey);
				hidden = JSON.parse(JSON.stringify(crawlerResults));
				var ds = addObj(ps,crawlerResults, 3);
				shown = ds[0];
				hidden = ds[1];
				keys = ds[2];
				ps = ds[3];
				setCookie(startingURL, recursionLimit, searchType, keywordSearch);
				crawlButton.disabled = false;
				crawlButton.innerHTML = "Crawl!";
				document.getElementById("starting-url").disabled = false;
				document.getElementById("recursion-limit").disabled = false;
				searchElement.disabled = false;	
				console.log("Crawling finished for " + jobID);
				document.getElementById("partial-results").innerHTML = "";
			},		
			error: function(jqXHR, stats, errThrown){
				crawlButton.disabled = false;
				crawlButton.innerHTML = "Crawl!";
				document.getElementById("starting-url").disabled = false;
				document.getElementById("recursion-limit").disabled = false;
				searchElement.disabled = false;
			 }		
		});

		// var done = false;
		var crawler_results = {nodes: {}, edges: {}}
		// setInterval(checkStatus, 5000);

		statusChecker(jobID);

	}

  var Renderer = function(canvas){
    var particleSystem
    var dom = $(canvas)
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d")
	 var depth = parseInt(document.getElementById("recursion-limit").value) + 1;

	 var that = {
      init:function(system){
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side

        
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()
      },
     
      redraw:function(){
        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)

        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          // draw a line from pt1 to pt2
          ctx.strokeStyle = "rgba(0,0,0, .1)"
          ctx.lineWidth = 0.2
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
			 ctx.closePath();
			 ctx.strokeStyle = "grey";
          ctx.stroke();
        })

        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

			node.fixed = true;
			var radius;
			if (node.data.color == "fuchsia"){
				ctx.fillStyle = "rgba(255,0,255,1)";
				radius = 10;
			} else if (node.data.level == 1){
				ctx.fillStyle = "red";
				radius = 5;
			} else {
				ctx.fillStyle = "grey";
				radius = 5;
			}
		
			ctx.beginPath();
			ctx.arc(pt.x,pt.y,radius,0,2.0* Math.PI);
			ctx.closePath();
			ctx.fill();
		  })    			
      },
      
      initMouseHandling:function(){
		  var nearest = null;
		  var scrollUp = 0;
		  var scrollDown = 0;

        var handler = {

          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
				nearest = particleSystem.nearest(_mouseP);
				selected = (nearest.distance < 50) ? nearest : null
            if (selected && selected.node !== null){
					window.open(selected.node.name,'_blank');
            }
            return false
          },

			 mouseover:function(e){
				var lbl = $('#mouseover-link')
				lbl.text("Site: ")
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = particleSystem.nearest(_mouseP);
				nearest = (nearest.distance < 50) ? nearest : null

				if (nearest && nearest.node != null){
					var link = document.createElement("a")
					if (typeof nearest.node.data.name != "undefined"){
						link.text = nearest.node.data.name;
						link.href = nearest.node.name
					} else {
						link.text = nearest.node.name;
						link.href = nearest.node.name;
					}
					lbl.append(link);
				}
				return false
		    },

			 scroll:function(e){
			 	if(e.originalEvent.detail > 0){
					scrollDown += 1;
					if (scrollDown == 5){
						scrollDown = 0;
					}
				} else {
					scrollUp += 1;
					if (scrollUp == 2){
						scrollUp = 0;
						var p = {data:particleSystem};
						var ds = addObj(p, hidden, 1);
						shown = ds[0];
						hidden = ds[1];
						keys = ds[2];
						p = ds[3];
					}
				}
				return false;
		  	 },

			 preventWindowScroll:function(e){
				e.preventDefault();
				$(window).bind("mousewheel",function(e){return false;});
				$(window).bind("DOMMouseScroll",function(e){return false;});
				return false;
			 },

			 unbindScrollLock:function(e){
				$(window).unbind("mousewheel");
				$(window).unbind("DOMMouseScroll");
				return false;
			 },
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);
		  $(canvas).mousemove(handler.mouseover);
		  $(canvas).mouseleave(handler.unbindScrollLock);
		  $(canvas).bind("mousewheel",handler.scroll);
		  $(canvas).bind("DOMMouseScroll",handler.scroll);
		  $(canvas).bind("mouseover",handler.preventWindowScroll);

      },
      
    }
    return that
  }    

  $(document).ready(function(){

	// check for pre-existing values in cookie
	var cookie = getCookie();
	if (cookie.length >= 3){
		document.getElementById("starting-url").value = cookie[0];
		document.getElementById("recursion-limit").value = cookie[1];
		var searchElement = document.getElementById("search-type");
		searchElement.options[searchElement.selectedIndex].value = cookie[2];
		if (typeof cookie[3] != "undefined")
			document.getElementById("keyword-search").value = cookie[3];
	}

	var sys = arbor.ParticleSystem({friction:0.5, stiffness:25, repulsion:10, fps:100, dt:0.01, precision: 0.1})
    sys.parameters({gravity:false}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...
	 $("#submit-crawl").click(sys, submitCrawl);
	 $("#btn-keyword-search").click(sys, searchForKeyword);
		
  })

})(this.jQuery)
