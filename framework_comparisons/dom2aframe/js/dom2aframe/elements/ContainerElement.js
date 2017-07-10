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
		console.log("ElementSpecificUpdate CONTAINER ", this.domelement);
		var width = this.position.width;
		var height = this.position.height;

		//console.error("Settting width and height", width, height);
		
		//this.aelement.setAttribute("width", 0);
		this.aelement.setAttribute("width", width);
		//this.aelement.setAttribute("height", 0);
		this.aelement.setAttribute("height", height);

        let domColor = element_style.getPropertyValue("background-color");

        // otherwhise they will show up as black + hiding them helps performance tremendously since they aren't drawn!!! (is the case for most containers -> just make sure to have 1 top-level container that is always drawn)
        if( domColor == this.DOM2AFrame.settings.transparantColor )
            this.aelement.setAttribute("visible", false);
        else
        {
            this.aelement.setAttribute("visible", true);

            let aColor = this.aelement.getAttribute("color");
		    if( aColor != domColor )
			    this.aelement.setAttribute('color', domColor);
        }
        


		this.aelement.setAttribute('position', this.position.xyz );
	}
}