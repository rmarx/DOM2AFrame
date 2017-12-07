# DOM2AFrame

DOM2AFrame is a project allowing you to transform HTML/CSS/JS webpages into equivalent 3D versions, ready for use in (Web)VR setups. 

We use the [A-Frame library](http://a-frame.io/) as the underlying framework to provide most of the VR/3D functionality. 

This library is a research prototype and *extremely non-production ready*. It is currently even split over two separate repositories:
* This repository: mainly focuses on the update loop logic, overflow clipping, text and border rendering.
* [The other repository](https://github.com/Lamasaurus/DOM2AFrame) (by Sander Vanhove): mainly focuses on custom CSS 3D properties, 3D video and additional input primitives. It also contains more examples. 

These repositories will be merged in the (near) future in this repository. 

To try out the current demo, clone the repository and use a local webserver to load /demos/hologram/index.html
This demo contains the normal 2D HTML/CSS webpage next to the DOM2AFrame 3D version. 
This currently only works as expected in Google Chrome. 

The main code is found in /framework_comparisons/dom2aframe.
Other code in /framework_comparisons/ is property of the respective authors and only included here for easy comparison. 
These libraries could need additional node_modules dependencies to be installed to function properly. 

You can read more about this work at [https://webvr.edm.uhasselt.be](https://webvr.edm.uhasselt.be).
