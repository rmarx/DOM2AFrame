class DOM2AFrameSettings {

    constructor() {

        this.DOMPixelsPerUnit = 50; // used to convert from DOM units to AFrame units (meters)

        this.startingZindex = -20; // how far the main container is from the camera on the z-axis by default
        this.startingLayerDepth = -0.2; // offset from config.startingZindex where the layers will actually be placed
        this.layerStepSize = 0.001; // z-space between the layers 

        this.ignoreElementTags      = new Set(["BR", "SOURCE"]);
        this.containerElementTags   = new Set(["DIV", "SECTION", "BODY", "TABLE", "TR"]);
        this.textElementTags        = new Set(["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "BUTTON", "A", "TD", "TH", "INPUT"]);
        this.imageElementTags       = new Set(["IMG"]);

        this.transparantColor       = undefined; // if undefined, will be calculated automatically
    }
}