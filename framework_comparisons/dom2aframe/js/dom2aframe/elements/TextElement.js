// TODO: make util function
function stripText(html){
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
}



class TextElement extends Element{
	constructor(DOM2AFrame, domelement, depth, registerEvents = true){
		super(DOM2AFrame, domelement, depth, registerEvents);

        // note, for text elements we want to build a compound setup to allow for background colors for the entity (in a-frame, something cannot have a background-color)
        // there are several ways to do this in a-frame, including an option to do it in a single tag:
        /*
		<a-entity
		geometry="primitive: plane; height: auto; width: auto"
		material="color: blue"
		text="width: 4; value: This text will be 4 units wide."></a-entity>
		*/
        // however, to keep things easy and clear, we will use a separate plane and text component inside an <a-entity> as container

        // note: this entity is just a dummy, positioned at 0,0,0 (relative to the parent container)
        // we don't actually use it to do positioning etc. of our real elements here, just to logically group them and add/delete them from the scene at the same time
        this.aelement = document.createElement("a-entity");

		//Make separate container and text element
		this.backgroundPlane = new ContainerElement(DOM2AFrame, domelement, depth - (this.DOM2AFrame.settings.layerStepSize/2), false); // background shouldn't register events, only our main a-text element (otherwise the same DOMElement would get double the events)
		this.atext = document.createElement("a-text");// new TextElement(domelement, depth);

		//Add container and text to this entity
		this.aelement.appendChild(this.backgroundPlane.AElement );
		this.aelement.appendChild(this.atext );

        this.children.add( this.backgroundPlane  );

        this.atext.setAttribute("align", "left"); 
		this.atext.setAttribute("anchor", "left"); // for some reason, anchor moves the pivot of the text element as well, but our coordinates are always relative to the CENTER 

        //this.aelement.setAttribute("width", "auto");
        //this.aelement.setAttribute("height", "auto");

		//this.aelement = this.atext; // TODO: figure out repercussions! done this to get mouse events working! 
		
		//this.backgroundPlane.AElement.addEventListener("mouseenter", (evt) => { console.log("TextElement mouseenter!", this.domelement); });

		if( registerEvents )
			this.SetupEventHandlers();

		if( this.domelement.tagName == "A" ){
			// custom logic needed for an anchor
			// we just want to trigger a click event, so need to register a dummy click handler
			this.domelement.addEventListener("click", (evt) => { console.log("Link clicked!", this.domelement.getAttribute("href"), this.domelement); })
		}
    }

	ElementSpecificUpdate(element_style){

		// note: updating the backgroundPlane is done automatically because it is registered as a child of this element. We only need to deal with our own stuff here
        // note that children are fully updated before their parent, so we might override some stuff for the backgroundPlane here if we would need to
		
		//console.log("ElementSpecificUpdate TEXT ");

		this._UpdateTextAlignment(element_style);

        this.atext.setAttribute("text", "value: " + stripText(this.domelement.innerHTML) + ";");

        let domColor = element_style.getPropertyValue("color");

        // otherwhise they will show up as black + hiding them helps performance tremendously since they aren't drawn!!! (is the case for most containers -> just make sure to have 1 top-level container that is always drawn)
        if( domColor == this.DOM2AFrame.settings.transparantColor )
            this.atext.setAttribute("visible", false);
        else
        {
            this.atext.setAttribute("visible", true);

            let aColor = this.atext.getAttribute("color");
		    if( aColor != domColor )
            {
			    this.atext.setAttribute('color', domColor);
            }
        }




		// we want to update text size, but this depends on if the font is loaded by this time or not (is an async operation)
		// getAttribute("text") doesn't give us access to the internal component data
		// .components["text"] does! w00t!
		let currentFont = this.atext.components["text"].currentFont;
		if( !currentFont ) 
		{
			let self = this;
			let handler = () => { self.atext.removeEventListener(handler); self._UpdateTextSize(element_style); };
			this.atext.addEventListener("textfontset", handler);
		}
		else
		{
			this._UpdateTextSize(element_style);
		}


	}

	_UpdateTextAlignment(element_style){

		// https://developer.mozilla.org/en-US/docs/Web/CSS/text-align
		let alignment = element_style.getPropertyValue("text-align");
		let anchor = "left";
		if( alignment == "center" )
			anchor = "center";
		else if( alignment == "right" )
			anchor = "right";
		else if( alignment == "left" )
			anchor = "left";
		else if(alignment == "start") // same as left if text-direction is left-to-right (which we assume for now) TODO: support right-to-left
			anchor = "left";
		else if( alignment == "end" ) // same as right if text-direction is left-to-right (which we assume for now) TODO: support right-to-left
			anchor = "right";
		else{
			anchor = "left";
			console.warn("TextElement:_UpdateTextAlignment : unsupported text alignment! ", alignment, this.domelement);
		}

		this.atext.setAttribute("anchor", anchor);
		this.atext.setAttribute("align", alignment);

        // need to do custom positioning here because anchoring text elements doesn't work properly (i.e. anchor center (as is default for other objects) and text-align left shifts the text way too far to the left)
        // so if we set our anchor to left and offset our calculated center-position (see the Position class), we account for this with correct positioning
 
		let xyz = this.position.xyz;
		if( anchor == "left" )
			xyz.x -= this.position.width / 2; // shift to the left to comply with the text anchor
		else if( anchor == "right" )
			xyz.x += this.position.width / 2; // shift to the right
		// if center, nothing to be done! 

        this.atext.setAttribute("position", xyz );
	}

	_UpdateTextSize(element_style){

		let currentFont = this.atext.components["text"].currentFont;
		let referenceFontSize = currentFont.info.size; // the base fontsize A-Frame will use to determine wrapping

		// calculated font size is always in pixels! w00t!
		let actualFontSize = parseFloat(element_style.getPropertyValue("font-size"));
		let fontScalingFactor = referenceFontSize / actualFontSize; // if actual > reference, this will be < 1, > 1 otherwhise 

		let widthInPixels = this.position.width / this.position.DOM2AFrameScalingFactor;
		let wrapPixels = widthInPixels * fontScalingFactor;
		wrapPixels *= 1.05; // for some reason there is still a slight discrepancy with our calculations. This is needed to get at least single-line text to not wrap at the end... MAGIC NUMBER!
		
		this.atext.setAttribute("wrap-pixels", wrapPixels);
		this.atext.setAttribute( "width", this.position.width);
		
		//console.warn("Set wrappixels to ", wrapPixels, widthInPixels, fontScalingFactor, this.position.DOM2AFrameScalingFactor, this.position.width, actualFontSize, currentFont.info);

        //var textSizeInPixels = 1 / this.DOM2AFrame.settings.DOMPixelsPerUnit;  

		/*
        // TODO: explain this calculation
        var width = (textSizeInPixels * parseFloat(element_style.getPropertyValue("font-size"))) *22;//* 20;
        if(width != this.atext.getAttribute("width"))
		{
        	this.atext.setAttribute("width",width);
		}
		*/

		//this.atext.setAttribute( "width", this.position.width );

		// https://github.com/aframevr/aframe/blob/60a440cc5070a0ce95d5e4efcf2c3b5e108cbd25/src/components/text.js
		// https://github.com/Jam3/three-bmfont-text 
		// https://github.com/Jam3/layout-bmfont-text 
		// https://www.npmjs.com/package/word-wrapper
		
			/*
			console.warn("current wrapPixels was : ", this.atext.getAttribute("wrapPixels") );
			//this.atext.setAttribute("wrapPixels", widthInPixels);
			this.atext.setAttribute("wrap-pixels", widthInPixels);
			console.warn("Set wrappixels to ", widthInPixels, this.position.width);
			*/
	};
}