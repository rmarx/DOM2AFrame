// TODO: make util function
function stripText(html){
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
}



class TextElement extends Element{
	constructor(DOM2AFrame, domelement, depth){
		super(DOM2AFrame, domelement, depth);

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
		this.backgroundPlane = new ContainerElement(DOM2AFrame, domelement, depth - (this.DOM2AFrame.settings.layerStepSize/2));
		this.atext = document.createElement("a-text");// new TextElement(domelement, depth);

		//Add container and text to this entity
		this.aelement.appendChild(this.backgroundPlane.AElement );
		this.aelement.appendChild(this.atext );

        this.backgroundPlane.mutationObserver.disconnect(); // otherwhise we would get mutations on our domelement twice, once for the Text and once for the Container 
        this.children.add( this.backgroundPlane  );

        this.atext.setAttribute("align", "left"); 
		this.atext.setAttribute("anchor", "left"); // for some reason, anchor moves the pivot of the text element as well, but our coordinates are always relative to the CENTER 

        //this.aelement.setAttribute("width", "auto");
        //this.aelement.setAttribute("height", "auto");
    }

	ElementSpecificUpdate(element_style){

		// note: updating the backgroundPlane is done automatically because it is registered as a child of this element. We only need to deal with our own stuff here
        // note that children are updated before their parent, so we might override some stuff for the backgroundPlane here if we would need to
		
		console.log("ElementSpecificUpdate TEXT ");

        // need to do custom positioning here because anchoring text elements doesn't work properly (i.e. anchor center (as is default for other objects) and text-align left shifts the text way too far to the left)
        // so we set our anchor to left and offset our calculated center-position (see the Position class) to account for this for correct positioning
        // TODO: FIXME: Take into account other text-align settings
		let xyz = this.position.xyz;
		let anchor = this.atext.getAttribute("anchor"); 
		if( anchor == "left" )
			xyz.x -= this.position.width / 2; // shift to the left to comply with the text anchor

        this.atext.setAttribute("position", xyz );

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


        var textSizeInPixels = 1 / this.DOM2AFrame.settings.DOMPixelsPerUnit; 

        // TODO: explain this calculation
        var width = (textSizeInPixels * parseFloat(element_style.getPropertyValue("font-size"))) *22;//* 20;
        if(width != this.atext.getAttribute("width"))
		{
        	this.atext.setAttribute("width",width);
		}

	}

    /*
class ButtonElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);

		this.aelement = document.createElement("a-entity");

		//Make separate container and text element
		this.aplane = new ContainerElement(domelement, depth - 0.0005);
		this.atext = new TextElement(domelement, depth);

		//Add container and text to this entity
		this.aelement.appendChild(this.aplane.getAElement());
		this.aelement.appendChild(this.atext.getAElement());

		//Make shure these are clickable by the raycaster
		this.aelement.classList.add('clickable');

		this.aelement.setAttribute("onclick", this.domelement.getAttribute("onclick"));
		//this.aplane.update(true);
		//this.atext.update(true);
		//this.update(true);
	}

	clickElement(){
		this.domelement.click();
	}

	elementSpecificUpdate(element_style){
		console.log("ElementSpecificUpdate BUTTON ");
		// if we come here, it means the top-level element was update with 100% surety (checked in the calling update())
		// so we have to force update the children as well
		// not doing this leads to the children not being updated at component ADD time either... 
		// TODO: find a better overall flow for this
		this.aplane.update(true); 
		this.atext.update(true);
	}
}
*/
}