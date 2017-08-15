

// TODO: colorify : https://stackoverflow.com/questions/7505623/colors-in-javascript-console
// Doesn't work... of course shows these lines as the originating lines... typical
//console.debug   = function(){ console.log(arguments); }
//console.verbose = function(){ console.log(arguments); }
//console.silly   = function(){ console.log(arguments); }
//console.FATAL   = function(){ console.error(arguments); }

class DOM2AFrame{

    // e.g. call with new DOM2AFrame( document.body ) or DOM2AFrame( document.getElementById("myID") )
    constructor( containerElement, settings = undefined ){

        this.settings = settings || new DOM2AFrameSettings();

        this.DOM = {};
        this.DOM.container           = containerElement;

        this.AFrame = {};
        this.AFrame.scene       = undefined; // <a-scene />
        this.AFrame.camera      = undefined; // <a-camera />
        this.AFrame.container   = undefined; // <a-entity id="aElementContainer" />
        this.AFrame.assets      = undefined; // <a-assets />

        this.elements = new Set();

        this.state = {};
        this.state.updateAll    = true;
        this.state.requestedFPS = 60;
        this.state.dirty        = false; // if anything is dirty in the whole scene: means we should check everything for changes
        this.state.acceptTreeMutations = true; // whether we accept changes in the trees 
        this.state._nextAssetID  = -1; // should be incremented each time we use this! 
        this.state.getNextAssetID = function(){ ++this._nextAssetID; return this._nextAssetID; }
        // NOTE: we could use this.AFrame.assets.childCount or something similar, but this gives problems when assets are deleted 

        this.state.currentLayerDepth = 0;
    }

    UpdateAll(){
        
        // update flow is like this:
        // each D2AElement listens to Mutation events on their own DOMElement
        // when they receive the mutation, they set their dirty flag and call UpdateAll()
        // this will then allow updates for all the elements in our container; the elements themselves will decide if they need to be updated.
        // The elements shouldn't only update for mutations however: if a mutation in 1 element causes other elements to shift (e.g. a floating div becomes too wide and pushes others down)
        // the impacted elements WON'T get a mutation event... so we need to check if their positions changed as well to decide if we need to update their AElements

        if ( this.state.updateAll && this.state.dirty ) {

            rS('dom2aframe').start();

            //Stop everything from updating when dragging
            if (IsDragEvent(this))
                return;

            console.log("DOM2AFrame: updateall");

            for (let element of this.elements)
                element.Update();

            this.state.dirty = false;
            rS('dom2aframe').end();
        }
    }

    AddDOMElement(DOMElement){

        if (DOMElement.tagName == undefined) {
            console.trace("DOM2AFrame:AddDOMElement : tried to add a non-tagged element (innertext, comment, etc.) : not adding to aframe", DOMElement);
            return undefined;
        }

        if( this.settings.ignoreElementTags.has(DOMElement.tagName) )
        {
            return undefined;
        }

        let layer = this.state.currentLayerDepth;

        console.log("DOM2AFrame:AddDOMElement : Adding element", DOMElement);
        var new_a_element = null; // TODO: rename this to something like newD2AElement

        if( this.settings.containerElementTags.has(DOMElement.tagName) ){   
            new_a_element = new ContainerElement(this, DOMElement, layer);
            //new_a_element.AElement.setAttribute("visible", "false");
        }
        else if( this.settings.textElementTags.has(DOMElement.tagName) ){   
            new_a_element = new TextElement(this, DOMElement, layer);
        }
        else if( this.settings.imageElementTags.has(DOMElement.tagName) ){   
            new_a_element = new ImageElement(this, DOMElement, layer);
        }
        else{
            console.error("DOM2AFrame:AddDOMElement : Element found that isn't supported by DOM2AFrame yet", DOMElement.tagName, DOMElement);
            return;
        }

        let domID = DOMElement.getAttribute("id");
        if( domID && domID != null )
            new_a_element.AElement.setAttribute("id", "a_" + domID );
        
        this.elements.add(new_a_element);

        // appendChild is ASYNC
        // this means we need to wait until A-frame says it's good and loaded
        // otherwise, we might update some attributes, which are then replace by a-frame's default attributes immediately after 
        let onLoaded = (event) => {
            new_a_element.Init();
            new_a_element.Update(true);
            new_a_element.AElement.removeEventListener("play", onLoaded);
        };

        // "loaded" event was too soon: setAttribute wasn't always used then. play seems to do the trick
        // https://aframe.io/docs/0.6.0/core/entity.html#events_loaded
        new_a_element.AElement.addEventListener("play", onLoaded);
        this.AFrame.container.appendChild(new_a_element.AElement);
        //new_a_element.update(true); // toon soon, need to wait until appendChild is done, see event handler above


        this.state.currentLayerDepth += this.settings.layerStepSize;

        return new_a_element;
    }

    RemoveDOMElement(DOMElement){
        for( let element of this.elements){
            if( element.DOMElement == DOMElement ){

                this.AFrame.container.removeChild( element.AElement );
                this.elements.remove( element ); 
                // TODO: remove DOMElement also maybe? probably best not though...
                // TODO: do event-listener cleanup here as well?

            }
        }
    }

    Init(debug = false){

        THREE.ImageUtils.crossOrigin = '';


        // TODO: FIXME: allow user to pass in a-scene he wants to see used instead of always creating a new one or looking for one 
        let a_scenes = document.getElementsByTagName("a-scene");
        this.AFrame.scene = undefined;

        if (a_scenes && a_scenes.length > 0)
            this.AFrame.scene = a_scenes[0];
        else
        {
            this.AFrame.scene = document.createElement("a-scene"); 
        }

        this.AFrame.scene.setAttribute("embedded", "true");

        let vrcss = document.createElement('style');
        vrcss.innerHTML = "a-scene{width: 600px; height: 600px;}"; // .a-enter-vr{position: fixed;} 
        document.body.appendChild(vrcss);


        //Assets
        this.AFrame.assets = document.createElement("a-assets");
        this.AFrame.assets.innerHTML = '<video id="iwb" autoplay="false" loop="true" src="../base/videoSTEREO.mp4"></video>';
        this.AFrame.scene.appendChild(this.AFrame.assets);

        //Container for all the generated elements
        this.AFrame.container = document.createElement("a-entity");
        this.AFrame.container.setAttribute("id", "aElementContainer");
        this.AFrame.container.setAttribute("position", "0 0 " + this.settings.startingZindex );
        this.AFrame.scene.appendChild(this.AFrame.container);

        //Calc the ammount of pixels in 1 meter
        var standard_p = document.createElement("p");
        standard_p.setAttribute("style", "font-size:1vw;")
        document.body.appendChild(standard_p);
        this.settings.DOMPixelsPerUnit = parseFloat(window.getComputedStyle(standard_p).getPropertyValue("font-size"));
        document.body.removeChild(standard_p);

        if( this.settings.transparantColor == undefined )
        {
            //Getting the value for this browser that means transparent
            var trans_element = document.createElement("div");
            trans_element.setAttribute("style", "background:none;display:none;");
            document.body.appendChild(trans_element);
            this.settings.transparantColor = window.getComputedStyle(trans_element).getPropertyValue("background-color");
            document.body.removeChild(trans_element);
        }

        // TODO: FIXME: allow the user to indicate if they want a camera made or not
        //Camera
        let cameraFar = 90;
        let camera_entity = document.createElement("a-entity");
        //camera_entity.setAttribute("position", body_width/2 + " 0 0");
        camera_entity.setAttribute("position", "0 0 0");
        this.AFrame.camera = document.createElement("a-camera");
        this.AFrame.camera.setAttribute("position", "0 0 0");
        this.AFrame.camera.setAttribute("user-height", "0");
        this.AFrame.camera.setAttribute("far", "" + cameraFar);
        this.AFrame.camera.setAttribute("near", "0.5");
        this.AFrame.camera.setAttribute("stereocam", "eye:left;");
        this.AFrame.camera.setAttribute("wasd-controls-enabled", "true");
        camera_entity.appendChild(this.AFrame.camera);



        //Sky
        // sky is only visible if we set the camera far-clipping plane to 5000+, otherwise it is culled... :(
        // if you want a default background, need to add it as a plane ourselves TODO
        /*
        var a_sky = document.createElement("a-sky");
        a_sky.setAttribute("color", "#FF0000");
        a_scene.appendChild(a_sky);
        */

        
        let background = document.createElement("a-plane");
        background.setAttribute("color", "#ffb2ae");
        background.setAttribute("position", "0 0 -" + cameraFar);
        background.setAttribute("scale", "600 400 1");
        //background.setAttribute("material", "shader: flat;");
        //this.AFrame.camera.appendChild(background); // child of camera, always stays in view 
        

        //Cursor
        let cursor = document.createElement("a-cursor");
        //cursor.setAttribute("fuse",true);
        cursor.setAttribute("fuse-timeout", 500);
        cursor.setAttribute("color", "green");
        cursor.setAttribute("raycaster", "far: "+cameraFar+";");//"objects: .clickable; far: "+cameraFar+";");
        this.AFrame.camera.appendChild(cursor);







        // TODO: make this mor resilient if we don't control the a-scene in hte first place
        let self = this;
        let enterVr = function () {
            self.UpdateAll();
            vrcss.innerHTML = ".a-enter-vr{position: fixed;} a-scene{height:0;} .a-canvas{ display: default; }";
        }

        let exitVr = function () {
            vrcss.innerHTML = ".a-enter-vr{position: fixed;} a-scene{height:0;} .a-canvas{ display: none; }";
        }

        if( debug )
            this.AFrame.scene.setAttribute("stats", true);

        this.AFrame.scene.addEventListener("enter-vr", enterVr);
        this.AFrame.scene.addEventListener("exit-vr", exitVr);
        this.AFrame.scene.appendChild(camera_entity);

        /*
        video_element = new VideoElement(body_width / 2 + " 0 0");
        a_scene.appendChild(video_element.GetElement(), camera_entity);

        video_element.init();
        video_element.SetScource("#iwb");
        */

        // shift element container up to the top left so the middle of the page is aligned with our camera
        // this is because elements in AFrame have their pivot in their CENTER, while elements in the DOM have their origin in the TOP LEFT
	    let DOMContainerWidth = window.getComputedStyle(this.DOM.container).width;
	    DOMContainerWidth = parseFloat(DOMContainerWidth).toFixed();
        DOMContainerWidth *= (1 / this.settings.DOMPixelsPerUnit);
        let DOMContainerHeight = window.getComputedStyle(this.DOM.container).height;
	    DOMContainerHeight = parseFloat(DOMContainerHeight).toFixed();
        DOMContainerHeight *= (1 / this.settings.DOMPixelsPerUnit);

        //DOMContainerHeight *= 0.85; // for some reason, this aligns better with our camera for now // TODO: FIXME: do better initial positioning! 

        console.log("Setting AFrame container position", "" + (-DOMContainerWidth/2) + " " + (DOMContainerHeight/2) + " " + this.settings.startingZindex)
        this.AFrame.container.setAttribute("position", "" + (-DOMContainerWidth/2) + " " + (DOMContainerHeight/2) + " " + this.settings.startingZindex);


        // TODO: FIXME: allow user to pass a parent element for a created a-scene
        let canvasContainer = document.getElementById("canvasContainer");
        if( !canvasContainer )
        {            
            document.body.appendChild(this.AFrame.scene);
        }
        else if (this.AFrame.scene.parentElement != canvasContainer) {
            canvasContainer.appendChild(this.AFrame.scene);
        }
        /*
        else
        {
            console.warn("Aframe scene parent element is", this.AFrame.scene.parentElement, canvasContainer, (this.AFrame.scene.parentElement == canvasContainer) );
            document.body.appendChild(this.AFrame.scene);
        }
        */
        
         // TODO: make sure the THREE.js renderer is always available here already!
        if( !this.AFrame.scene.renderer )
            this.AFrame.scene.addEventListener("render-target-loaded", () => { 
                this.AFrame.scene.renderer.localClippingEnabled = true; }, {once: true});
        else
            this.AFrame.scene.renderer.localClippingEnabled = true;

        this._TransformFullDOM();

    } // Init()

    _TransformFullDOM(){

        // TODO: clear this.AFrame.scene first?

        if( this.settings.elementIterationStrategy == this.settings.elementIterationStrategies.TREE ){


            let addDOMChildrenRecursively = (parent, currentNode) => {

                if( !currentNode || currentNode == null ){
                    console.error("_TransformFullDOM : currentNode not defined... ", currentNode, parent);
                }

                let aElement = this.AddDOMElement( currentNode );

                if( !aElement ) // i.e. unknown tag that we don't handle yet
                    return;

                if( currentNode.children && currentNode.children.length > 0 ){
                    for( let child of currentNode.children ){
                        addDOMChildrenRecursively( currentNode, child );
                    }
                }
            };

            addDOMChildrenRecursively( undefined, this.DOM.container );
        }
        else if(this.settings.elementIterationStrategy == this.settings.elementIterationStrategies.FLAT ){
            let items = Array.from( this.DOM.container.getElementsByTagName("*") );
            items.unshift( this.DOM.container ); // prepend container itself because we also want to render it and as the first item

            // TODO: FIXME: currently we assume the items will always be in the corret z-index sorted order when the come out of getElementsByTagName()
            // this might not always be the case!!! need to sort them somehow? computedStyle.z-index maybe? but that will be the same for everything? need to take into account parent-child relationships etc... difficult

            //Transcode every element in the page
            for (let item of items)
                this.AddDOMElement( item );
        }
        else
            console.error("DOM2AFrame:_TransformFullDOM : elementIterationStrategy not supported!", this.settings, this);

       

        var self = this;
        //Observer to check for newly added or deleted DOM elements
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (self.state.acceptTreeMutations) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        self.AddDOMElement(mutation.addedNodes[i]);
                        self.state.dirty = true;
                        self.UpdateAll();
                    }
                }
                for (var i = 0; i < mutation.removedNodes.length; i++) {
                    self.RemoveDOMElement(mutation.removedNodes[i]);
                    self.state.dirty = true;
                    self.UpdateAll();
                }
            })
        });
        observer.observe( this.DOM.container, { childList: true } );
    }

} // class DOM2AFrame




// TODO: refactor and relocate this! 
var grabbing = false;

//Check if the event is triggered because of a grab
function IsDragEvent(element){
	if(!(element instanceof ContainerElement))
		return false;

	var dom_element = element.DOMElement;
	if(dom_element.tagName == "BODY" && dom_element.classList.contains("a-grabbing") && !grabbing){
		grabbing = true;
		return true;
	}else if(dom_element.tagName == "BODY" && !dom_element.classList.contains("a-grabbing") && grabbing){
		grabbing = false;
		return true;
	}
	return false;
}


document.onkeydown = checkKey;

function checkKey(e) {

    e = e || window.event;

    console.log("key pressed", e);

    //press E or A to go up and down. 
    //press P to show video
    //press T to change video representation method
    //press L to toggle moving
    //press N to stop dynamicaly adding elements
    if (e.keyCode == '65') { // E up 
    	var pos = camera_entity.getAttribute("position");
        camera_entity.setAttribute("position", pos.x+ " "+ (pos.y + 2) +" "+ pos.z);
        video_element.SetPosition(pos);
    }
    else if (e.keyCode == '69') { // A down
        var pos = camera_entity.getAttribute("position");
        camera_entity.setAttribute("position", pos.x+ " "+ (pos.y - 2) +" "+ pos.z);
        video_element.SetPosition(pos);
    } else if (e.keyCode == '84') {
        video_element.ToggleMode();
    } else if (e.keyCode == '80') { // P
    	var v_element_visibility = video_element.IsVisible();
        a_element_container.setAttribute("visible", v_element_visibility);

        //Set position of the elements away from the clickable part
        var position = a_element_container.getAttribute("position");
        if(v_element_visibility){
        	position.y = 0;
        	cursor.setAttribute("raycaster","objects: .clickable; far: 90;");
        }else{
			position.y = 500;
			cursor.setAttribute("raycaster","objects:; far: 90;");
        }
        a_element_container.setAttribute("position", position);

        video_element.SetVisiblity(!v_element_visibility);
    } else if (e.keyCode == '76'){
    	//getAttribute for "wasd-controls-enebled" is a string
    	camera.setAttribute("wasd-controls-enabled",!(camera.getAttribute("wasd-controls-enabled") == "true"));
    } else if (e.keyCode == '78'){ // N 
    	//dynamic_add_elements = !dynamic_add_elements;
		
        /*
        let els = Array.from(DOM2AFrame1.elements);
		for( var i = 0; i < 5; ++i )
		{
			els[i].AElement.setAttribute("color", "#FF0000");//.update();
		}
        */

        //document.getElementById("paragraphOne").style.fontSize = "5em";
        let isVisible = document.getElementById("fullBox").getAttribute("visible");
        if( isVisible == true || isVisible == "true" )
            isVisible = true;
        else
            isVisible = false;

        document.getElementById("fullBox").setAttribute("visible", !isVisible );
    }
    else if( e.keyCode == '67' ){ // c
        /*
        console.log("Adding click events to paragraphOne");
        document.getElementById("paragraphOne").addEventListener("click", () => { alert("Paragraph one clicked via addEventListener!"); });
        //document.getElementById("paragraphOne").onclick = () =>  { alert("Paragraph one clicked via .onclick!"); };
        document.getElementById("paragraphOne").setAttribute("onclick", () =>  { alert("Paragraph one clicked via setAttribute!"); } );
        */

        //document.getElementById("paragraphOne").innerHTML = "INNERHTML change leads to mutationRecord?";
        /*
        let clickHandler = () => { alert("imageLeft clicked! From a-frame!"); document.getElementById("imageLeft").removeEventListener('click', clickHandler); };
        document.getElementById("imageLeft").addEventListener("click", clickHandler );
        
        let mousedownHandler = () => { console.log("imageLeft mousedown! From a-frame!"); document.getElementById("imageLeft").removeEventListener('mousedown', mousedownHandler); };
        document.getElementById("imageLeft").addEventListener("mousedown", mousedownHandler );
        */

        // this does NOT trigger mutation events!
        /* 
        let borderCSS = document.createElement('style');
        borderCSS.innerHTML = "*{ border: 1px solid blue;}"; // .a-enter-vr{position: fixed;} 
        document.body.appendChild(borderCSS);
        */

        let overflowContainer2 = document.getElementById("overflowContainer2");
        changeFunctions.animateWidthEl(overflowContainer2);
    }

}

/*
function load(){
    if(!init_started){
        init_started = true;
        init();
    }
}

document.addEventListener("page_fully_loaded", load); 
document.dispatchEvent(page_fully_loaded_event);
*/