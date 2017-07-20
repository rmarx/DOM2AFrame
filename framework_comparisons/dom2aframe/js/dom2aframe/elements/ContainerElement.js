class ContainerElement extends Element{
	constructor(DOM2AFrame, domelement, depth, registerEvents = true){
		super(DOM2AFrame, domelement, depth, registerEvents);

		this.aelement = document.createElement("a-plane");
        //this.aelement.setAttribute("wireframe", true);
		//this.update(true);

		
		if( this.domelement.tagName == "INPUT" && this.domelement.getAttribute("type") == "checkbox")
		{
			this.customBorder = { color: {r:0,g:0,b:0}, width: 1 }; // TODO: make this more general so we can override all styles!
		}

		if( registerEvents )
			this.SetupEventHandlers();
	}

	ElementSpecificUpdate(element_style){
		//console.log("ElementSpecificUpdate CONTAINER ", this.domelement);

		var width = this.position.width;
		var height = this.position.height;

		//console.error("Settting width and height", width, height);
		
		//this.aelement.setAttribute("width", 0);
		this.aelement.setAttribute("width", width);
		//this.aelement.setAttribute("height", 0);
		this.aelement.setAttribute("height", height);

		// TODO: extract this into a Util/Helper class
		let isUrl = (s) => {
			var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
			return regexp.test(s);
		};

        let domColor = element_style.getPropertyValue("background-color");
		let backgroundImage = element_style.getPropertyValue("background-image");

		// TODO: make sure this works when toggling bg images (probably not at this point, need to somewho unset src: attribute if none)
		if( backgroundImage != "none" && isUrl(backgroundImage) ){
			// backgroundImage is of the form   url("PATH"), so we need to get rid of the url("") part
			backgroundImage = backgroundImage.substring(backgroundImage.lastIndexOf('(\"')+2,backgroundImage.lastIndexOf('\")'));
			
			this.aelement.setAttribute('material','src: #' + this.GetAsset(backgroundImage, "img"));
		}
		else{
			// otherwhise they will show up as black + hiding them helps performance tremendously since they aren't drawn!!! (is the case for most containers -> just make sure to have 1 top-level container that is always drawn)
			if( domColor == this.DOM2AFrame.settings.transparantColor ){
				// want to keep raycasting enabled but hide the mesh...
				// so cannot just do setAttribute("visible", false) because that interferes with raycasting
				// note that we cannot set threejs material directly: https://stackoverflow.com/questions/34908664/three-js-invisible-plane-not-working-with-raycaster-intersectobject (believe me, i've tried)

				// TODO: make this dependent ok whether we're listening for mouse events or not!
				// i have a feeling it's still rendering every pixel of this plane, event with opacity at 0, we would prefer to skip rendering alltogeter with this.aelement.setAttribute("visible", "false");, but can only do that if we don't need raycasting abilities
				this.aelement.setAttribute("opacity", "0");
			}
			else
			{
				this.aelement.setAttribute("opacity", "1");

				let aColor = this.aelement.getAttribute("color");
				if( aColor != domColor )
					this.aelement.setAttribute('color', domColor);
			}
		}

		this.aelement.setAttribute('position', this.position.xyz );

		this.UpdateBorders(element_style);
	}

	
}