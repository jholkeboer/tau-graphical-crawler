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

function htmlCode(level, totalLevels){
	// htmlCode(level, totalLevels) where level is 0 indexed and totalLevels is a count
	// The following example covers all color levels
	/*
	console.log(htmlCode(0,4));
	console.log(htmlCode(1,4));
	console.log(htmlCode(2,4));
	console.log(htmlCode(3,4));
	*/
	var p = (level / (totalLevels - 1)).toPrecision(3);
	if ( (level / (totalLevels-1)).toPrecision(6) <= 0.5){
		var c = Math.floor(255 * p / 0.5);
		c = (c == 0) ? "00" : c;
		return (255).toString(16) + "00" + c.toString(16);
	} else{
		var c = Math.floor(255-(p - 0.5)/0.5 * 255).toString(16);
		c = (c == 0) ? "00" : c;
		return c +"00"+ (255).toString(16);
	}
}

(function($){

 	var clearCanvas = function(ps){
		ps.data.eachNode(function(node,pt){
			ps.data.pruneNode(node);
		});
		//var canvas = $("#viewport").get(0);
		//var ctx = canvas.getContext("2d");
		//ctx.clearRect(0,0,canvas.width,canvas.height);
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
				console.log(crawlerResults)
				ps.data.graft(crawlerResults)
			}
		})
	}

  var Renderer = function(canvas){
    var dom = $(canvas)
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d")
    var particleSystem

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
          ctx.strokeStyle = "rgba(0,0,0, .333)"
          ctx.lineWidth = 0.25
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
			
			
			ctx.arc(pt.x,pt.y,2,0,2.0* Math.PI);
			ctx.closePath();
			ctx.fillStyle = "grey";
			ctx.fill();
			/*
		    var w = ctx.measureText(node.data.name||"").width+20
			 var label = node.name
			 ctx.clearRect(pt.x-w/2,pt.y-7,w,20)
			 ctx.font = "bold 11px Consolas"
			 ctx.textAlign = "center"
			 //ctx.fillStyle = "#" + htmlCode(node.data.level,4);
			 ctx.fillStyle = "grey";
			 ctx.fillText(label||"",pt.x,pt.y+4)
			 */
        })    			
      },
      
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;
		  var nearest = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {

          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
				nearest = particleSystem.nearest(_mouseP);
            //nearest = dragged = particleSystem.nearest(_mouseP);
				selected = (nearest.distance < 50) ? nearest : null
            if (selected && selected.node !== null){
					/*particleSystem.addNode("link1","link2");
					particleSystem.addEdge(selected.node,"link1");*/
					window.open(selected.node.data.link,'_blank');
            }
            return false
          },

			 mouseover:function(e){
				var lbl = $('#mouseover-link')
				lbl.text("Traces: ")
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

          dragged:function(e){
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
				
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
				
            _mouseP = null
            return false
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);
		  $(canvas).mousemove(handler.mouseover);

      },
      
    }
    return that
  }    

  $(document).ready(function(){
//    var sys = arbor.ParticleSystem(1000, 600, 0.5) // ( repulsion/stiffness/friction )
		var sys = arbor.ParticleSystem(1, 1, 1) // ( repulsion/stiffness/friction )
    sys.parameters({gravity:false}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...
	 $("#submit-crawl").click(sys, submitCrawl);
		
  })

})(this.jQuery)

