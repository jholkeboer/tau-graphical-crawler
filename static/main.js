/*	 var crawlerResultsSample = {
	 	nodes:{
				google:{link:"http://www.google.com",level:0},
				yahoo:{link:"http://www.yahoo.com",level:1},
				lycos:{link:"http://www.lycos.com",level:2},
				metacrawler:{link:"http://www.metacrawler.com",level:2},
				ask:{link:"http://www.ask.com",level:3}
				},
		edges:{
				google:{yahoo:{}},
				yahoo:{lycos:{},metacrawler:{}},
				lycos:{ask:{}}
		}
	}

	 var crawlerResultsSample2 = {
	 	nodes:{
				google:{link:"http://www.google.com",level:0},
				yahoo:{link:"http://www.yahoo.com",level:1},
				},
		edges:{
				google:{yahoo:{}},
		}
	}*/


function nodeColors(levels){
	var partition = (510 / (levels)).toPrecision(3);
	var colors = []
	for (var i = 0 ; i < levels+1 ; i++){
		var n = partition * i;
		var r = (n <= 255) ? 255 : 510 - n;
		var b = (n <= 255) ? n : 255; 
		colors.push({"r":r,"g":0,"b":b});
	}
	return colors;
}

(function($){

	var shown = {nodes:{},edges:{}};
	var hidden = {nodes:{},edges:{}};
	var key, rootKey, childkeys,noEdges;

 	var addObj = function(ps,obj,numEdges){
		var c = 0;
		while( c < numEdges){
			shown.edges[key] = shown.edges[key] || {};
			shown.nodes[key] = shown.nodes[key] || JSON.parse(JSON.stringify(obj.nodes[key]));
			var keys = Object.keys(obj.edges[key]);
			for ( var child in obj.edges[key] ){
				if (obj.edges[key].hasOwnProperty(child)){
					c += 1;
					shown.edges[key][child] = JSON.parse(JSON.stringify(obj.edges[key][child]));
					//console.log("key");
					//console.log(key);
					//console.log("deleting");
					//console.log(child);
					//console.log("from");
					//console.log(hidden.edges[key]);
					delete hidden.edges[key][child];
					//console.log(hidden.edges);
					//console.log(shown.nodes);
					//console.log(child);
					//console.log(obj.nodes);
					//console.log(obj.nodes[child]);
					try {
						shown.nodes[child] = JSON.parse(JSON.stringify(obj.nodes[child]));
					} catch(err){
						console.log(child + " not a node in request");
					}
				}
				if (c >= numEdges) break;
			}
			if ($.isEmptyObject(hidden.edges[key])){
				delete hidden.edges[key];
				key = keys.pop(keys);
			}
		}
		ps.data.merge(shown);
		return [shown,hidden,key];
	}

 	var clearCanvas = function(ps){
		ps.data.eachNode(function(node,pt){
			ps.data.pruneNode(node);
		});
	}

	var submitCrawl = function(ps){
		clearCanvas(ps);
		var startingURL = document.getElementById("starting-url").value;
		var recursionLimit = document.getElementById("recursion-limit").value;
		var searchElement = document.getElementById("search-type");
		var searchType = searchElement.options[searchElement.selectedIndex].value;

		$.ajax({
			url: "/crawl",
			type: "POST",
			data: {"startingURL": startingURL,
					"recursionLimit": recursionLimit,
					"searchType": searchType},
			success: function(result) {

				shown = {nodes:{},edges:{}};
				hidden = {nodes:{},edges:{}};
				childkeys = [];
				var crawlerResults = JSON.parse(result).result;
				rootKey = Object.keys(crawlerResults.nodes).filter(function(value, index, array){
					return crawlerResults.nodes[value].level == 1;
				})[0];
				key = rootKey;
				hidden = JSON.parse(JSON.stringify(crawlerResults));
				console.log("Original");
				console.log(JSON.stringify(crawlerResults));
				var ds = addObj(ps,crawlerResults, 3);
				shown = ds[0];
				hidden = ds[1];
				key = ds[2];
				childKeys = ds[3];

				//console.log("shown:");
				//console.log(shown);
				//console.log("hidden: ");
				//console.log(hidden);
				//console.log("key: ");
				//console.log(key);
			}
		})
	}

  var Renderer = function(canvas){
    var particleSystem
    var dom = $(canvas)
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d")
	 var depth = parseInt(document.getElementById("recursion-limit").value);

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

			//ctx.fillStyle = "#" + htmlCode(node.data.level,2);
			node.fixed = true;
			
			var c = nodeColors(depth);
			var l = parseInt(node.data.level)-1;

			/*
			if (50 + 500 * (l / depth) > 0)	
				node.p.y = 50 + 500 * (l / depth)
			*/
			if (l >= 0){
				ctx.fillStyle = "rgba(" + c[l].r + "," + c[l].g + "," + c[l].b +",.8)";
			} else {
				ctx.fillStyle = "grey";
			}
			ctx.beginPath();
			ctx.arc(pt.x,pt.y,5,0,2.0* Math.PI);
			ctx.closePath();
			ctx.fill();
			 //var w = ctx.measureText(node.data.name||"").width+20
			 //var label = node.name
			 //ctx.clearRect(pt.x-w/2,pt.y-7,w,20)
			 //ctx.font = "bold 11px Consolas"
			 //ctx.textAlign = "center"
			 //ctx.fillStyle = "#" + htmlCode(node.data.level,4);
			 //ctx.fillStyle = "grey";
			 //ctx.fillText(label||"",pt.x,pt.y+4)
		  })    			
      },
      
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;
		  var nearest = null;
		  var scrollUp = 0;
		  var scrollDown = 0;
        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {

          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
				nearest = particleSystem.nearest(_mouseP);
				selected = (nearest.distance < 50) ? nearest : null
            if (selected && selected.node !== null){
					window.open(selected.node.data.link,'_blank');
            }
            return false
          },

			 mouseover:function(e){
				var lbl = $('#mouseover-link')
				lbl.text("Site: ")
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = dragged = particleSystem.nearest(_mouseP);
				nearest = (nearest.distance < 50) ? nearest : null

				if (nearest && nearest.node != null){
					var link = document.createElement("a")
					link.text = nearest.node.data.link
					link.href = nearest.node.data.link
					lbl.append(link)
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
					//	console.log(JSON.stringify(hidden.edges));
					//	console.log(!$.isEmptyObject(hidden.edges[key]));
						if (!$.isEmptyObject(hidden.edges[key])){
							var p = {data:particleSystem};
							addObj(p, hidden, 1);
						} else {
							console.log("All nodes graphed!");
						}
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
//		var sys = arbor.ParticleSystem({friction:0.2, stiffness:250, repulsion:10, fps:100, dt:0.01, precision: 0.1})
		var sys = arbor.ParticleSystem({friction:0.5, stiffness:25, repulsion:10, fps:100, dt:0.01, precision: 0.1})
    sys.parameters({gravity:false}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...
	 $("#submit-crawl").click(sys, submitCrawl);
		
  })

})(this.jQuery)
