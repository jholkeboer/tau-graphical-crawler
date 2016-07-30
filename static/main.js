	 var crawlerResultsSample = {
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
	}

function nodeColors(levels){
	var partition = (510 / levels).toPrecision(3);
	var colors = []
	for (var i = 0 ; i < levels ; i++){
		var n = partition * i;
		var r = (n <= 255) ? 255 : 255 - n % 255;
		if (n == 510) r = 0;
		var b = (n <= 255) ? n : 255; 
		colors.push({"r":r,"g":0,"b":b});
	}
	return colors;
}

(function($){

	var shown = {nodes:{},edges:{}};
	var hidden = {nodes:{},edges:{}};
//	if (typeof hidden.edges[i] == "undefined"){

 	var showObj = function(ps,obj,numEdges){
		var c = 0;

		$.map(obj.edges, function(val,i){
			if (c < numEdges){
				shown.edges[i] = shown.edges[i] || {};
				shown.nodes[i] = shown.nodes[i] || JSON.parse(JSON.stringify(obj.nodes[i]));	
			} else {
				hidden.edges[i] = hidden.edges[i] || {};
				hidden.nodes[i] = hidden.nodes[i] || JSON.parse(JSON.stringify(obj.nodes[i]));
			}
			for (var property in val){
				if (val.hasOwnProperty(property)){
					console.log(property);
					if (c < numEdges){
						shown.edges[i][property] = shown.edges[i][property] || {};
						shown.nodes[property] = shown.nodes[property] || JSON.parse(JSON.stringify(obj.nodes[property]));
					} else {
						hidden.edges[i] = hidden.edges[i] || {};
						hidden.nodes[i] = hidden.nodes[i] || {};
						hidden.edges[i][property] = hidden.edges[i][property] || {};
						hidden.nodes[property] = hidden.nodes[property] || JSON.parse(JSON.stringify(obj.nodes[property]));
					}
					c += 1;
				}
			}
		});			
		console.log("shown:");
		console.log(shown);
		console.log("hidden: ");
		console.log(hidden);
		ps.data.merge(shown);
		return [shown,hidden];
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
				var crawlerResults = JSON.parse(result).result;
				var ds = showObj(ps,crawlerResults,3);
				shown = ds[0];
				hidden = ds[1];
			}
		})
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

			//ctx.fillStyle = "#" + htmlCode(node.data.level,2);
			node.fixed = true;
			
			var c = nodeColors(depth);
			var l = parseInt(node.data.level)-1;
			/*
			if (50 + 500 * (l / depth) > 0)	
				node.p.y = 50 + 500 * (l / depth)
			*/
			ctx.fillStyle = "grey";

			/*
			if (l){
				ctx.fillStyle = "rgba(" + c[l].r + "," + c[l].g + "," + c[l].b +",.333)";
			} else {
				ctx.fillStyle = "grey";
			}*/
			ctx.beginPath();
			ctx.arc(pt.x,pt.y,2,0,2.0* Math.PI);
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
						//increaseNodes();

					}
				} else {
					scrollUp += 1;
					if (scrollUp == 5){
						scrollUp = 0;
						//decreaseNodes();
					}
				}
				return false;
		  	 },

			 preventCanvasWindow:function(e){
				e.preventDefault();
				$(window).bind("mousewheel",function(e){return false;});
				$(window).bind("DOMMouseScroll",function(e){return false;});
				return false;
			 },
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);
		  $(canvas).mousemove(handler.mouseover);
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
