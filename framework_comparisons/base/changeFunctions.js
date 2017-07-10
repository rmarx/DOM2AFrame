       var changeFunctions = {};

        changeFunctions.animateColors = function()
        {
            var el = document.getElementById("textRight");
            el.style.animation = 'animColor 2s 1';

            el.addEventListener('animationend', function(){
                this.style.webkitAnimationName = '';
                this.style.animationName = '';
            }, false);

            return 2;
        }

        changeFunctions.changeFloat = function()
        {
            var img = document.getElementById("imageLeft");
            var text = document.getElementById("textRight");

            text.style.float = 'right';
            img.style.float = 'right';

            return 0.5;
        }

        changeFunctions.changeColor = function()
        {
            var textRightPone = document.getElementById("textRight").getElementsByTagName("p")[0];
            textRightPone.style.color = 'blue';

            return 0.5;
        }

        changeFunctions.changeText = function()
        {
            var textRightPtwo = document.getElementById("textRight").getElementsByTagName("p")[1];
            textRightPtwo.innerHTML = 'paragraph 2 AUGMENTED';

            return 0.5;
        }

        changeFunctions.changeWidth = function()
        {
            var center = document.getElementById("center");
            center.style.width = "75%";

            return 0.5;
        }

        changeFunctions.changeFontSize = function()
        {
            var textRightPone = document.getElementById("textRight").getElementsByTagName("p")[0];
            textRightPone.style.fontSize = '2em';

            return 0.5;
        }

        changeFunctions.animateFontSize = function()
        {
            var el = document.getElementById("textRight").getElementsByTagName("p")[0];
            el.style.animation = 'animFontsize 2s 2';

            el.addEventListener('animationend', function(){
                this.style.webkitAnimationName = '';
            }, false);

            return 4;
        }

        changeFunctions.animateWidth = function()
        {
            let mover = async function()
            {
                var center = document.getElementById("center");
                var width = center.offsetWidth;
                while( width > 300 )
                {
                    width--;
                    center.style.width = width + "px";
                    await sleep(0.1);
                }

                while( width < 500 )
                {
                    width++;
                    center.style.width = width + "px";
                    await sleep(0.1);
                }
            }

            mover();

            return 4;
        }

        changeFunctions.changeDisplay = function()
        {
            let none = document.getElementById("none");
            none.style.display = 'block';

            return 0.5;
        }

        changeFunctions.changeVisibility = function()
        {
            let hidden = document.getElementById("hidden");
            hidden.style.visibility = 'visible';

            return 0.5;
        }

        changeFunctions.changeOpacity = function()
        {            
            var textRightPtwo = document.getElementById("textRight").getElementsByTagName("p")[1];
            textRightPtwo.style.opacity = '1';

            return 0.5;
        }

        changeFunctions.createP = function()
        {
            let p = document.createElement("p");
            p.innerHTML = "I am new!";

            let textRight = document.getElementById("textRight");
            textRight.appendChild( p );

            return 0.5;
        }

        changeFunctions.removeImage = function()
        {
            let img = document.getElementById("imageLeft");
            img.parentElement.removeChild( img );

            return 0.5;
        }

        changeFunctions.startVideo = function()
        {
            let video = document.getElementById("video");
            video.style.display = 'block';
            video.play();

            return 9;
        }

        changeFunctions.duplicateContainer = function()
        {
            let container = document.getElementById("container");
            let containerClone = container.cloneNode(true);
            containerClone.setAttribute("id", "container2");
            containerClone.style.float = 'none';
            container.appendChild(containerClone);

            return 0.5;
        }


        function sleep(ms) 
        {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        let changeEverything = async function(preSleepCallback = undefined)
        {
            let functionNames = Object.keys(changeFunctions);

            for( let functionName of functionNames )
            {
                let timeout = changeFunctions[ functionName ]();
                timeout *= 1000; 

                if( preSleepCallback )
                    preSleepCallback(functionName, timeout);

                await sleep( timeout );
            }
        }


        
        function imageClicked(evt){
            alert("Image was clicked! via .onclick handler in DOM");
            console.log("Image was clicked! via .onclick handler in DOM", evt);
        }

        //(function(){console.log("STATS!");var script=document.createElement('script');script.onload=function(){var stats=new Stats();stats.showPanel( 0 );document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});};script.src='http://rawgit.com/mrdoob/stats.js/master/build/stats.min.js';document.head.appendChild(script);})();