let DOM2Aframe = {};
DOM2Aframe.pixels_per_unit = 1;

var pixels_in_one_unit,pixel_text_size;
//Standard z index for the element container 
var z_index = -20;

//The depth at which div's start to get placed
var div_depth = -0.2;

//Width of the body
var body_width;

var update_all = true;

var a_elements = new Array();

var img_id = 0;

var animation_fps = 999;

//Indicates that something was dirty and all other elements should check if they changed
var somethingdirty = false;

var vrcss;

var page_fully_loaded_event = new Event('page_fully_loaded');

var init_started = false;

//Container for all the transcoded elements
var a_element_container

//The element that will paly the video's
var video_element;

//The id for image assets
var img_id = 0;

//The section of a-frame where the image and video assets get placed
var a_assets;

var transparent;

var dynamic_add_elements = true;

class Position{

	static get DOM2AFrameScalingFactor()
	{
		// TODO: this is kinda dirty since we're accessing a global var...
		// we divide 1 by pixels_per_unit to get someting we can directly multiply with DOM coordinates to get AFrame coordaintes
		// because: 25 pixels per unit = 25 pixels per meter -> 1 pixel = 1/25 meters
		// so DOMPosition (in pixels) * DOM2AFrameScalingFactor (pixels per meter) = AFramePosition (in meters)
		return 1 / DOM2Aframe.pixels_per_unit;
	}

    constructor(DOMPosition, depthModifier){
		this.depthModifier = depthModifier;
		this.updateFromDOMPosition(DOMPosition);
    }

	updateFromDOMPosition(DOMPosition){
		this.DOMPosition = DOMPosition;
		this.AFramePosition = Position.CalculateAFramePosition(this.DOMPosition);
		this.AFramePosition.z = this.depthModifier;
	}

	static CalculateAFramePosition(DOMPosition){
		// DOMPosition is the return value of domelement.getBoundingClientRect();
		// it has fields .top, .bottom, .left and .right
		// in the DOM, the origin is on the TOP LEFT

		// AFramePosition needs to be in the AFrame coordinate system, which uses x, y and z values and a local origin/pivot at the CENTER of the element
		// In our setup, we just convert into x and y from width and height and keep the "global origin is on the TOP LEFT" idea
		// we put all the elements in a container entity that is then correctly positioned, so we don't have to worry about world-scale positioning or changing of y-axis logic here
		let output = {};
		output.z = 0; // TODO: take into account CSS z-index or other set attributes... will muck up the API a bit though

		let width = DOMPosition.right - DOMPosition.left;
		let height = DOMPosition.bottom - DOMPosition.top; // bottom - top because positive y-axis is pointing DOWN in the DOM, so bottom always > top

		output.x = DOMPosition.left + width/2;
		output.y = DOMPosition.top + height/2; 

		// at this moment, our coordinates are in DOM-scale, which means 1 unit = 1 pixel
		// however, in AFrame, 1 unit = 1 meter and we don't want to directly map 1 pixel = 1 meter of course
		// so, we apply a scaling factor (calculated elsewhere) to bring x, y and z into proper AFrame measures
		output.x *= Position.DOM2AFrameScalingFactor;
		output.y *= Position.DOM2AFrameScalingFactor * -1; // -1 because AFrame has the y-axis pointing upwards
		output.z *= Position.DOM2AFrameScalingFactor; // future proofing the code

		output.width = width * Position.DOM2AFrameScalingFactor;
		output.height = height * Position.DOM2AFrameScalingFactor;

		return output;
	}

	get x(){
		return this.AFramePosition.x;
	}

	get y(){
		return this.AFramePosition.y;
	}

	get z(){
		return this.AFramePosition.z;
	}

	get width(){
		return this.AFramePosition.width;
	}

	get height(){
		return this.AFramePosition.height;
	}

	get xyz(){
		return {x: this.x, y: this.y, z: this.z};
	}

	equalsDOMPosition(DOMPosition){
        return 	this.DOMPosition.top 	== DOMPosition.top && 
				this.DOMPosition.bottom == DOMPosition.bottom && 
				this.DOMPosition.left 	== DOMPosition.left && 
				this.DOMPosition.right 	== DOMPosition.right;
	}
}

class Element{
	constructor(domelement, depthModifier){
		this.domelement = domelement;
		this.aelement = null;

        //Listenes for direct css changes
		(new MutationObserver(this.updateDirt.bind(this))).observe(this.domelement, { attributes: true, childList: true, characterData: true, subtree: false });
		(new MutationObserver(UpdateAll.bind(this))).observe(this.domelement, { attributes: true, childList: false, characterData: true, subtree: false });

        //Listenes for css animations
        this.domelement.addEventListener("animationstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("animationend", this.stopAnimation.bind(this));

        //Listenes for transition changes, only works on Microsoft Edge
        this.domelement.addEventListener("transitionstart", this.startAnimation.bind(this));
        this.domelement.addEventListener("transitionend", this.stopAnimation.bind(this));

        this.position = new Position( this.domelement.getBoundingClientRect(), depthModifier );

        //Flag for when we need to redraw
        this.dirty = false;
	}

    startAnimation(){
        this.stopIntervall();
        this.interval = setInterval(this.updateAnimation.bind(this), 1000/animation_fps);
    }

    stopAnimation(){
        this.stopIntervall();
        this.updateAnimation();
    }

    stopIntervall(){
        clearInterval(this.interval);            
    }

    //Update for one Animation frame
    updateAnimation(){
        this.updateDirt();
        UpdateAll.bind(this).call();
    }

    setDirty(){
    	this.dirty = true;
    }

    isDirty(){
    	return this.dirty;
    }

	getAElement(){
		return this.aelement;
	}

	getDomElement(){
		return this.domelement;
	}

    //Gets called on the object that invokes the whole update chain, which is garanteed to be dirty
    updateDirt(mutation){
    	console.log(this);
    	console.log(mutation);
        this.setDirty();
        this.update();
        somethingdirty = true;
    }

    update(forceUpdate = false){
        //get new position
        var DOMPosition = this.domelement.getBoundingClientRect();
		//console.trace("Updating position", DOMPosition, JSON.stringify(DOMPosition));

        //Check if something changed since last time, else we just stop the update
        if(this.position.equalsDOMPosition(DOMPosition) && !this.isDirty() && !forceUpdate)
            return;

        //Cash the last position
        this.position.updateFromDOMPosition(DOMPosition);

        var element_style = window.getComputedStyle(this.domelement);
        this.elementSpecificUpdate(element_style);

        //Set the opacity of the element
        var new_opacity = 0;
        if(element_style.getPropertyValue("visibility") !== "hidden" && element_style.getPropertyValue("display") !== "none")
            new_opacity = parseFloat(element_style.getPropertyValue("opacity"));
    	this.aelement.setAttribute("opacity", "");
    	this.aelement.setAttribute("opacity", new_opacity);

        this.dirty = false;
    }
}

function stripText(html){
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText;
}

class TextElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);

		this.aelement = document.createElement("a-text");
		this.aelement.setAttribute("align", "left"); 
		this.aelement.setAttribute("anchor", "left"); // for some reason, anchor moves the pivot of the text element as well, but our coordinates are always relative to the CENTER


		// TODO: update to entity with background color that auto-scales with text: 
		/*
		<a-entity
		geometry="primitive: plane; height: auto; width: auto"
		material="color: blue"
		text="width: 4; value: This text will be 4 units wide."></a-entity>
		// note: SHOULD also work if we just have an top-level entity with a-plane and a-text inside and setting stuff to auto? *should work*
		*/
	}

	elementSpecificUpdate(element_style){
		//Calc the y possition
        //var y = -((this.position.bottom - this.position.top) / 2 + this.position.top);
		
		console.log("ElementSpecificUpdate TEXT ");

		console.error("Setting text position ", this.position.xyz );

		let xyz = this.position.xyz;
		let anchor = this.aelement.getAttribute("anchor"); 
		if( anchor == "left" )
			xyz.x -= this.position.width / 2; // shift to the left to comply with the text anchor

        this.aelement.setAttribute("position", xyz );

		//this.aelement.setAttribute("wrapPixels",  (this.position.width / Position.DOM2AFrameScalingFactor) );

        //Style attributes
        this.aelement.setAttribute("text", "value: " + stripText(this.domelement.innerHTML) + ";");

        //We have to reset the color to a void value.
        if(transparent != element_style.getPropertyValue("color")){
			//this.aelement.setAttribute('color', "");
	        this.aelement.setAttribute('color', element_style.getPropertyValue("color"));
	    }

		//this.aelement.setAttribute("width",0);
		//let fontSize =

        var width = (pixel_text_size * parseFloat(element_style.getPropertyValue("font-size"))) * 20;
		let widthSet = false;
        if(width != this.aelement.getAttribute("width"))
		{
			widthSet = true;
        	this.aelement.setAttribute("width",width);
		}

		
		// setTimeout( () => {
		// 	alert( "Text " + this.aelement.getAttribute("width") + " // " +  width + " // " + this.aelement.getAttribute("wrapCount") + " -> " + widthSet  );
		// }, 2000);
		

		//this.aelement.setAttribute("wrapCount", 10);

	}
}

class ContainerElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);

		this.aelement = document.createElement("a-plane");
		//this.update(true);
	}

	elementSpecificUpdate(element_style){
		console.log("ElementSpecificUpdate CONTAINER ");
		var width = this.position.width;
		var height = this.position.height;

		//console.error("Settting width and height", width, height);
		
		this.aelement.setAttribute("width", 0);
		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", 0);
		this.aelement.setAttribute("height", height);
		if(transparent != element_style.getPropertyValue("background-color"))
			this.aelement.setAttribute('color', element_style.getPropertyValue("background-color"));


		this.aelement.setAttribute('position', this.position.xyz );
	}
}

class ImageElement extends Element{
	constructor(domelement, depth){
		super(domelement, depth);

		//Image asset creation
		this.asset = this.domelement.cloneNode(true);
        var asset_id = "img-asset-" + img_id++;
        this.asset.setAttribute("id",asset_id);

		this.aelement = document.createElement("a-image");
		this.aelement.setAttribute("src","#"+asset_id);

		//Initiation update
		//this.update(true);
	}

	getAsset(){
		return this.asset;
	}

	elementSpecificUpdate(element_style){
		console.log("ElementSpecificUpdate IMAGE ");
		var width = this.position.width;
		var height = this.position.height;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);

		this.aelement.setAttribute('position', this.position.xyz);
	}
}

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

var grabbing = false;

//Check if the event is triggered because of a grab
function IsDragEvent(element){
	if(!(element instanceof ContainerElement))
		return false;

	var dom_element = element.getDomElement();
	if(dom_element.tagName == "BODY" && dom_element.classList.contains("a-grabbing") && !grabbing){
		grabbing = true;
		return true;
	}else if(dom_element.tagName == "BODY" && !dom_element.classList.contains("a-grabbing") && grabbing){
		grabbing = false;
		return true;
	}
	return false;
}

function UpdateAll(mutations){
	//Only update when we want to update everything and something is dirty
    if(update_all && somethingdirty){

		rS('dom2aframe').start();
        //Stop everything from updating when dragging
        if(IsDragEvent(this))
            return;

        console.log("updateall");

    	for(var i = 0; i < a_elements.length; i++)
    		a_elements[i].update();

        somethingdirty = false;
		rS('dom2aframe').end();
	}
}

function AddNewElement(element){
	if( element.tagName == undefined ){
		console.trace("tried to add a non-tagged element (innertext, comment, etc.) : not adding to aframe", element);
		return;
	}
	
	let depthModifier = div_depth;

	console.log("Adding element", element);
	var new_a_element = null;

	if(element.tagName == "BODY" || element.tagName == "DIV" || element.tagName == "SECTION"){
		new_a_element = new ContainerElement(element,depthModifier);
		new_a_element.getAElement().setAttribute("visible", "false");
	}

    if( element.tagName == "P" || element.tagName.startsWith("H") && parseFloat(element.tagName.split("H")[1])){
		new_a_element = new TextElement(element, depthModifier);
    }

    //Images
    if(element.tagName == "IMG"){
      new_a_element = new ImageElement(element, depthModifier);
      a_assets.appendChild(new_a_element.getAsset());
    }

    if(element.tagName == "BUTTON" || element.tagName == "A" ){
    	new_a_element = new ButtonElement(element, depthModifier);
    }


    if(new_a_element != null){

		// appendChild is ASYNC
		// this means we need to wait until A-frame says it's good and loaded
		// otherwise, we might update some attributes, which are then replace by a-frame's default attributes immediately after 
		let onLoaded = (event) => {
			new_a_element.update(true);
			new_a_element.getAElement().removeEventListener("play", onLoaded);
		};

		// "loaded" event was too soon: setAttribute wasn't always used then. play seems to do the trick
		// https://aframe.io/docs/0.6.0/core/entity.html#events_loaded
		new_a_element.getAElement().addEventListener("play", onLoaded);
    	a_element_container.appendChild(new_a_element.getAElement());
    	a_elements.push(new_a_element);
		//new_a_element.update(true);

    }
	else
		console.error("Element found that isn't supported by Dom2Aframe yet", element);

	
    div_depth += 0.001;

    /*if(!element.getAttribute("keepinvr"))
        element.style.display="none";*/
}

function RemoveElement(removed_element){
	for(var i = 0; i < a_elements.length; i++){
		if(a_elements[i].getDomElement() == removed_element){
			a_element_container.removeChild(a_elements[i].getAElement());

			a_elements.splice(i,1);
		}
	}
}

function dom2aframe_init( containerElement ){
    THREE.ImageUtils.crossOrigin = '';

	
	let container = containerElement;
	/*
	if( containerID )
		container = document.getElementById(containerID);
	else 
		container = document.body;
		*/


	a_scenes = document.getElementsByTagName("a-scene");
	a_scene = undefined;
	
	if( a_scenes && a_scenes.length > 0 )
		a_scene = a_scenes[0];
	else
		a_scene = document.createElement("a-scene");

	a_scene.setAttribute("embedded", "true");
	
    vrcss = document.createElement('style');
    vrcss.innerHTML = "a-scene{width: 600px; height: 600px;}"; // .a-enter-vr{position: fixed;} 
    document.body.appendChild(vrcss);
	body_width = window.getComputedStyle(a_scene).width;
	body_width = parseFloat(body_width).toFixed();


    //Assets
    a_assets = document.createElement("a-assets");
    a_assets.innerHTML = '<video id="iwb" autoplay="false" loop="true" src="city-4096-mp4-30fps-x264-ffmpeg.mp4"></video>';
    a_scene.appendChild(a_assets);

    //Container for all the generated elements
    a_element_container = document.createElement("a-entity");
    a_element_container.setAttribute("id", "aElementContainer"); 
	a_element_container.setAttribute("position", "0 0 " + z_index);
    a_scene.appendChild(a_element_container);

    //Calc the ammount of pixels in 1 meter
	var standard_p = document.createElement("p");
	standard_p.setAttribute("style", "font-size:1vw;")
    document.body.appendChild(standard_p);
    pixels_in_one_unit = parseFloat(window.getComputedStyle(standard_p).getPropertyValue("font-size"));
    pixel_text_size = 1/pixels_in_one_unit;
	DOM2Aframe.pixels_per_unit = pixels_in_one_unit;
    document.body.removeChild(standard_p);

    //Getting the value for this browser that means transparent
    var trans_element = document.createElement("div");
	trans_element.setAttribute("style", "background:none;display:none;");
    document.body.appendChild(trans_element);
	transparent = window.getComputedStyle(trans_element).getPropertyValue("background-color");
	document.body.removeChild(trans_element);


	//Camera
	let cameraFar = 90;
	camera_entity = document.createElement("a-entity");
	//camera_entity.setAttribute("position", body_width/2 + " 0 0");
	camera_entity.setAttribute("position", "0 0 0"); 
	camera = document.createElement("a-camera");
	camera.setAttribute("position", "0 0 0");
	camera.setAttribute("far", "" + cameraFar);
	camera.setAttribute("near", "0.5");
	camera.setAttribute("stereocam","eye:left;");
	camera.setAttribute("wasd-controls-enabled", "true");
	camera_entity.appendChild(camera);



    //Sky
	// sky is only visible if we set the camera far-clipping plane to 5000+, otherwise it is culled... :(
	// if you want a default background, need to add it as a plane ourselves TODO
	/*
    var a_sky = document.createElement("a-sky");
    a_sky.setAttribute("color", "#FF0000");
    a_scene.appendChild(a_sky);
	*/
	background = document.createElement("a-plane");
	background.setAttribute("color", "#ffb2ae");
	background.setAttribute("position", "0 0 -" + cameraFar);
	background.setAttribute("scale", "600 400 1");
	background.setAttribute("material", "shader: flat;"); 
	camera.appendChild( background ); // child of camera, always stays in view 

	//Cursor
	cursor = document.createElement("a-cursor");
	//cursor.setAttribute("fuse",true);
	cursor.setAttribute("fuse-timeout",500);
	cursor.setAttribute("color","green");
	cursor.setAttribute("raycaster","objects: .clickable; far: 90;")
	camera.appendChild(cursor);

    //a_scene.setAttribute("stats", true);
    a_scene.addEventListener("enter-vr",enterVr);
    a_scene.addEventListener("exit-vr",exitVr);
	a_scene.appendChild(camera_entity);

	video_element = new VideoElement(body_width/2 + " 0 0"); 
    a_scene.appendChild(video_element.GetElement(), camera_entity);

    video_element.init();
    video_element.SetScource("#iwb");


	let canvasContainer = document.getElementById("canvasContainer");
	if( a_scene.parentElement != canvasContainer )
	{
    	canvasContainer.appendChild(a_scene);
	}


	// Time to actually add the DOM items
	items = new Array(container);
	var doc_items = container.getElementsByTagName("*");

	for(var i = 0; i < doc_items.length; i++)
		items.push(doc_items[i]);
	
    //Transcode every element in the page
	for (i = 0; i < items.length; i++)
		AddNewElement(items[i]);

	//Observer to check for newly added or deleted DOM elements
	var observer = new WebKitMutationObserver(function(mutations) {
	    mutations.forEach(function(mutation) {
	    	if(dynamic_add_elements){
		        for(var i = 0; i < mutation.addedNodes.length; i++){
		            AddNewElement(mutation.addedNodes[i]);
		            somethingdirty = true;
		            UpdateAll();
		        }
		    }
	        for(var i = 0; i < mutation.removedNodes.length; i++){
	            RemoveElement(mutation.removedNodes[i]);
	            somethingdirty = true;
	            UpdateAll();
	        }
	    })
	});
	observer.observe(container, {childList: true});

};

function enterVr(){
    UpdateAll();
    vrcss.innerHTML = ".a-enter-vr{position: fixed;} a-scene{height:0;} .a-canvas{ display: default; }";
}

function exitVr(){
    vrcss.innerHTML = ".a-enter-vr{position: fixed;} a-scene{height:0;} .a-canvas{ display: none; }";
}

document.onkeydown = checkKey;

function checkKey(e) {

    e = e || window.event;

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
		//UpdateAll();
		for( var i = 0; i < 5; ++i )
		{
			a_elements[i].getAElement().setAttribute("color", "#FF0000");//.update();
		}
		//a_elements[1].update();
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