class ImageElement extends Element{
	constructor(DOM2AFrame, domelement, depth){
		super(DOM2AFrame, domelement, depth);

		//Image asset creation
		this.asset = this.domelement.cloneNode(true);
        var asset_id = "img-asset-" + this.DOM2AFrame.state.getNextAssetID();
        this.asset.setAttribute("id",asset_id);

        this.DOM2AFrame.AFrame.assets.appendChild( this.asset );

		this.aelement = document.createElement("a-image");
        this.aelement.setAttribute("id", "IMAGE_" + asset_id);
		this.aelement.setAttribute("src","#"+asset_id);

        console.warn("Created Image asset with source", asset_id, this.aelement, this.DOM2AFrame.AFrame.assets);

		//Initiation update
		//this.update(true);
	}

	ElementSpecificUpdate(element_style){
		console.log("ElementSpecificUpdate IMAGE ");
		var width = this.position.width;
		var height = this.position.height;

		this.aelement.setAttribute("width", width);
		this.aelement.setAttribute("height", height);

		this.aelement.setAttribute('position', this.position.xyz);
	}
}