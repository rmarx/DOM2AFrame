class ContainerElement extends Element{
	constructor(DOM2AFrame, domelement, depth, registerEvents = true){
		super(DOM2AFrame, domelement, depth, registerEvents);

		this.aelement = document.createElement("a-plane");
        //this.aelement.setAttribute("wireframe", true);
		//this.update(true);

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

        let domColor = element_style.getPropertyValue("background-color");

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
		
        


		this.aelement.setAttribute('position', this.position.xyz );
	}
}