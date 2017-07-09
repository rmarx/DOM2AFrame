class VideoElement{
	constructor(position, camera){

		this.video_element = document.createElement("a-entity");
		this.SetVisiblity(false);

		this.video_element.innerHTML = '<a-video id="flatvid" src="" width="16" height="9" position="0 0 -10"></a-video>'
	      +'<a-videosphere radius="80" id="sphericalvid" src="" visible="false" rotation="0 180 0"></a-videosphere>'
	      +'<a-entity id="vidcontrol" video-controls="src:"></a-entity>'
	      +'<a-entity id="lefteye" geometry="primitive: sphere; radius: 80; segmentsWidth: 64; segmentsHeight: 64;" material="shader: flat; src:;" scale="-1 1 1" stereo="eye:left" visible="false">'
	      +'</a-entity>'
	      +'<a-entity id="righteye" geometry="primitive: sphere; radius: 80; segmentsWidth: 64; segmentsHeight: 64;" material="shader: flat; src:;" scale="-1 1 1" stereo="eye:right" visible="false">'
	      +'</a-entity>';

		this.SetPosition(position);
	    this.video_element.addEventListener("componentchanged", this.PositionOfCameraChanged.bind(this));

	    this.mode = 0;
	}

	/*
	*	Should be called after the element is added to the document
	*/
	init(){
		this.flatvid = document.getElementById("flatvid");
	  	this.sphericalvid = document.getElementById("sphericalvid");
	    this.lefteye = document.getElementById("lefteye");
	    this.righteye = document.getElementById("righteye");
	    this.videocontrols = document.getElementById("vidcontrol");
	}

	GetElement(){
		return this.video_element;
	}

	ToggleMode(){
		this.mode = (this.mode + 1)%3;

        this.ShowVideo();
	}

	SetScource(source){
		this.flatvid.setAttribute("src",source);
	  	this.sphericalvid.setAttribute("src",source);
	    this.lefteye.setAttribute("material","shader:flat; src:"+source+";");
	    this.righteye.setAttribute("material","shader:flat; src:"+source+";");

	    this.videocontrols.setAttribute("video-controls","src:"+source+"");
	}

	PositionOfCameraChanged(e){
		if(e.name === "position"){
			this.SetPosition(e.newData);
		}
	}

	SetPosition(position){
		this.video_element.setAttribute("position", position);
	}

	ShowVideo(){
		if(this.mode == 0)
          flatvid.setAttribute("visible", true);
        else
          flatvid.setAttribute("visible", false);

        if(this.mode == 1)
          this.sphericalvid.setAttribute("visible", true);
        else
          this.sphericalvid.setAttribute("visible", false);

        if(this.mode == 2){
          this.lefteye.setAttribute("visible", true);
          this.righteye.setAttribute("visible", true);
        }else{
          this.lefteye.setAttribute("visible", false);
          this.righteye.setAttribute("visible", false);
        }
	}

	SetVisiblity(bool){
      	this.video_element.setAttribute("visible", bool);
	}

	IsVisible(){
		return this.video_element.getAttribute("visible");
	}
}