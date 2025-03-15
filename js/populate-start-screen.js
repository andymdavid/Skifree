// This script adds objects to the start screen
(function() {
    console.log("Populate start screen script loaded");
    
    // Function to add objects to the start screen
    function addObjectsToStartScreen() {
        console.log("Attempting to add objects to start screen");
        
        if (!window.game || !window.Sprite || !window.sprites) {
            console.log("Game not fully loaded yet, retrying in 100ms");
            setTimeout(addObjectsToStartScreen, 100);
            return;
        }
        
        console.log("Game loaded, adding objects to start screen");
        
        // Add trees
        function addTree(x, y, type) {
            var tree = new window.Sprite(window.sprites[type]);
            tree.setMapPosition(x, y);
            window.game.addStaticObject(tree);
            console.log("Added tree at", x, y);
        }
        
        // Add trees very close to the player
        addTree(-30, 30, 'smallTree');
        addTree(30, 30, 'tallTree');
        addTree(-40, -20, 'tallTree');
        addTree(40, -20, 'smallTree');
        
        // Add trees in a grid pattern
        for (var x = -100; x <= 100; x += 40) {
            for (var y = -100; y <= 100; y += 40) {
                if ((Math.abs(x) > 20 || Math.abs(y) > 20) && // Not too close to player
                    Math.random() < 0.5) { // Only place some trees for a more natural look
                    var treeType = Math.random() < 0.5 ? 'smallTree' : 'tallTree';
                    addTree(x, y, treeType);
                }
            }
        }
        
        // Add snowboarders
        if (window.Snowboarder) {
            var boarder1 = new window.Snowboarder(window.sprites.snowboarder);
            boarder1.setMapPosition(-50, -50);
            boarder1.setSpeed(0);
            window.game.addMovingObject(boarder1);
            console.log("Added snowboarder at -50, -50");
            
            var boarder2 = new window.Snowboarder(window.sprites.snowboarder);
            boarder2.setMapPosition(50, -50);
            boarder2.setSpeed(0);
            window.game.addMovingObject(boarder2);
            console.log("Added snowboarder at 50, -50");
        } else {
            console.log("Snowboarder constructor not available");
        }
        
        // Add jumps
        if (window.sprites.jump) {
            var jump1 = new window.Sprite(window.sprites.jump);
            jump1.setMapPosition(-30, -70);
            window.game.addStaticObject(jump1);
            console.log("Added jump at -30, -70");
            
            var jump2 = new window.Sprite(window.sprites.jump);
            jump2.setMapPosition(30, -70);
            window.game.addStaticObject(jump2);
            console.log("Added jump at 30, -70");
        }
        
        // Add rocks
        if (window.sprites.rock) {
            var rock1 = new window.Sprite(window.sprites.rock);
            rock1.setMapPosition(-60, -60);
            window.game.addStaticObject(rock1);
            console.log("Added rock at -60, -60");
            
            var rock2 = new window.Sprite(window.sprites.rock);
            rock2.setMapPosition(60, -60);
            window.game.addStaticObject(rock2);
            console.log("Added rock at 60, -60");
        }
        
        // Increase spawn rates for snowboarders
        if (window.randomlySpawnNPC && window.spawnBoarder) {
            var originalRandomlySpawnNPC = window.randomlySpawnNPC;
            window.randomlySpawnNPC = function(spawnFunction, dropRate) {
                if (spawnFunction === window.spawnBoarder) {
                    dropRate = dropRate * 5; // 5x more snowboarders
                }
                return originalRandomlySpawnNPC(spawnFunction, dropRate);
            };
            console.log("Increased snowboarder spawn rate");
        }
    }
    
    // Try to add objects as soon as possible
    if (document.readyState === "complete") {
        // Document already loaded
        addObjectsToStartScreen();
    } else {
        // Wait for document to load
        window.addEventListener("load", function() {
            // Try multiple times to ensure we catch the game after it's loaded
            setTimeout(addObjectsToStartScreen, 500);
            setTimeout(addObjectsToStartScreen, 1000);
            setTimeout(addObjectsToStartScreen, 2000);
        });
    }
})(); 