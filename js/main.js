// Global dependencies which return no modules
require('./lib/canvasRenderingContext2DExtensions');
require('./lib/extenders');
require('./lib/plugins');

// External dependencies
var Hammer = require('hammerjs');
var Mousetrap = require('br-mousetrap');

// Method modules
var isMobileDevice = require('./lib/isMobileDevice');

// Game Objects
var SpriteArray = require('./lib/spriteArray');
var Monster = require('./lib/monster');
var Sprite = require('./lib/sprite');
var Snowboarder = require('./lib/snowboarder');
var Skier = require('./lib/skier');
var InfoBox = require('./lib/infoBox');
var Game = require('./lib/game');

// Local variables for starting the game
var mainCanvas = document.getElementById('skifree-canvas');
var dContext = mainCanvas.getContext('2d');
var imageSources = [ 'sprite-characters.png', 'skifree-objects.png' ];
var global = this;
var infoBoxControls = 'Use the mouse or WASD to control the player';
if (isMobileDevice()) infoBoxControls = 'Tap or drag on the piste to control the player';
var sprites = require('./spriteInfo');

var pixelsPerMetre = 18;
var distanceTravelledInMetres = 0;
var monsterDistanceThreshold = 2000;
var livesLeft = 5;
var highScore = 0;
var loseLifeOnObstacleHit = false;
var gameStarted = false; // Flag to track if the game has started
var dropRates = {smallTree: 4, tallTree: 2, jump: 1, thickSnow: 1, rock: 1};
if (localStorage.getItem('highScore')) highScore = localStorage.getItem('highScore');

function loadImages (sources, next) {
	var loaded = 0;
	var images = {};

	function finish () {
		loaded += 1;
		if (loaded === sources.length) {
			next(images);
		}
	}

	sources.each(function (src) {
		var im = new Image();
		im.onload = finish;
		im.src = src;
		dContext.storeLoadedImage(src, im);
	});
}

function monsterHitsSkierBehaviour(monster, skier) {
	skier.isEatenBy(monster, function () {
		livesLeft -= 1;
		monster.isFull = true;
		monster.isEating = false;
		skier.isBeingEaten = false;
		monster.setSpeed(skier.getSpeed());
		monster.stopFollowing();
		var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
		monster.setMapPositionTarget(randomPositionAbove[0], randomPositionAbove[1]);
	});
}

function startNeverEndingGame (images) {
	var player;
	var startSign;
	var infoBox;
	var game;

	function showStartScreen() {
		// Create start screen elements
		var startScreen = document.createElement('div');
		startScreen.className = 'start-screen';
		startScreen.id = 'start-screen';
		
		var title = document.createElement('h1');
		title.textContent = 'SkiFree.js';
		
		var instructions = document.createElement('p');
		instructions.innerHTML = isMobileDevice() 
			? 'Tap or drag on the piste to control the skier<br>Double-tap for speed boost'
			: 'Use arrow keys or mouse to control the skier<br>Press F for speed boost<br>Press T to do a trick';
		
		var startButton = document.createElement('button');
		startButton.className = 'start-button';
		startButton.textContent = 'Start Game';
		
		var keyboardNote = document.createElement('p');
		keyboardNote.innerHTML = 'or press any key to start';
		keyboardNote.style.fontSize = '16px';
		keyboardNote.style.marginTop = '10px';
		keyboardNote.style.opacity = '0.8';
		
		// Append elements to start screen
		startScreen.appendChild(title);
		startScreen.appendChild(instructions);
		startScreen.appendChild(startButton);
		startScreen.appendChild(keyboardNote);
		
		// Append start screen to body
		document.body.appendChild(startScreen);
		
		// Add event listener to start button
		startButton.addEventListener('click', function() {
			gameStarted = true;
			document.body.removeChild(startScreen);
			// Make sure the game is unpaused when the start button is clicked
			if (game.isPaused()) {
				game.reset();
			}
		});

		// Also allow any key to start the game
		document.addEventListener('keydown', function startGameKeyHandler(e) {
			if (!gameStarted) {
				gameStarted = true;
				document.body.removeChild(startScreen);
				document.removeEventListener('keydown', startGameKeyHandler);
				// Make sure the game is unpaused when a key is pressed
				if (game.isPaused()) {
					game.reset();
				}
			}
		});
	}

	function resetGame () {
		distanceTravelledInMetres = 0;
		livesLeft = 5;
		highScore = localStorage.getItem('highScore');
		game.reset();
		game.addStaticObject(startSign);
	}

	function detectEnd () {
		if (!game.isPaused()) {
			highScore = localStorage.setItem('highScore', distanceTravelledInMetres);
			infoBox.setLines([
				'Game over!',
				'Hit space to restart'
			]);
			game.pause();
			game.cycle();
		}
	}

	function randomlySpawnNPC(spawnFunction, dropRate) {
		var rateModifier = Math.max(800 - mainCanvas.width, 0);
		if (Number.random(1000 + rateModifier) <= dropRate) {
			spawnFunction();
		}
	}

	function spawnMonster () {
		var newMonster = new Monster(sprites.monster);
		var randomPosition = dContext.getRandomMapPositionAboveViewport();
		newMonster.setMapPosition(randomPosition[0], randomPosition[1]);
		newMonster.follow(player);
		newMonster.setSpeed(player.getStandardSpeed());
		newMonster.onHitting(player, monsterHitsSkierBehaviour);

		game.addMovingObject(newMonster, 'monster');
	}

	function spawnBoarder () {
		var newBoarder = new Snowboarder(sprites.snowboarder);
		var randomPositionAbove = dContext.getRandomMapPositionAboveViewport();
		var randomPositionBelow = dContext.getRandomMapPositionBelowViewport();
		newBoarder.setMapPosition(randomPositionAbove[0], randomPositionAbove[1]);
		newBoarder.setMapPositionTarget(randomPositionBelow[0], randomPositionBelow[1]);
		newBoarder.onHitting(player, sprites.snowboarder.hitBehaviour.skier);

		game.addMovingObject(newBoarder);
	}

	player = new Skier(sprites.skier);
	
	// Override player movement methods to check if game has started
	var originalStartMovingIfPossible = player.startMovingIfPossible;
	player.startMovingIfPossible = function() {
		if (!gameStarted) return;
		originalStartMovingIfPossible.apply(player);
	};
	
	var originalSetMapPositionTarget = player.setMapPositionTarget;
	player.setMapPositionTarget = function(x, y) {
		if (!gameStarted) return;
		originalSetMapPositionTarget.apply(player, [x, y]);
	};
	
	var originalSetDirection = player.setDirection;
	player.setDirection = function(direction) {
		if (!gameStarted) return;
		originalSetDirection.apply(player, [direction]);
	};
	
	var originalResetDirection = player.resetDirection;
	player.resetDirection = function() {
		if (!gameStarted) return;
		originalResetDirection.apply(player);
	};
	
	player.setMapPosition(0, 0);
	player.setMapPositionTarget(0, -10);
	if (loseLifeOnObstacleHit) {
		player.setHitObstacleCb(function() {
			livesLeft -= 1;
		});
	}

	game = new Game(mainCanvas, player);

	startSign = new Sprite(sprites.signStart);
	game.addStaticObject(startSign);
	startSign.setMapPosition(-50, 0);
	dContext.followSprite(player);

	infoBox = new InfoBox({
		initialLines : [
			'SkiFree.js',
			infoBoxControls,
			'Travelled 0m',
			'High Score: ' + highScore,
			'Skiers left: ' + livesLeft
		],
		position: {
			top: 15,
			right: 10
		}
	});

	game.beforeCycle(function () {
		// Skip all game logic if the game hasn't started yet
		if (!gameStarted) return;
		
		var newObjects = [];
		if (player.isMoving) {
			newObjects = Sprite.createObjects([
				{ sprite: sprites.smallTree, dropRate: dropRates.smallTree },
				{ sprite: sprites.tallTree, dropRate: dropRates.tallTree },
				{ sprite: sprites.jump, dropRate: dropRates.jump },
				{ sprite: sprites.thickSnow, dropRate: dropRates.thickSnow },
				{ sprite: sprites.rock, dropRate: dropRates.rock },
			], {
				rateModifier: Math.max(800 - mainCanvas.width, 0),
				position: function () {
					return dContext.getRandomMapPositionBelowViewport();
				},
				player: player
			});
		}
		if (!game.isPaused()) {
			game.addStaticObjects(newObjects);

			randomlySpawnNPC(spawnBoarder, 0.1);
			distanceTravelledInMetres = parseFloat(player.getPixelsTravelledDownMountain() / pixelsPerMetre).toFixed(1);

			if (distanceTravelledInMetres > monsterDistanceThreshold) {
				randomlySpawnNPC(spawnMonster, 0.001);
			}

			infoBox.setLines([
				'SkiFree.js',
				infoBoxControls,
				'Travelled ' + distanceTravelledInMetres + 'm',
				'Skiers left: ' + livesLeft,
				'High Score: ' + highScore,
				'Current Speed: ' + player.getSpeed()/*,
				'Skier Map Position: ' + player.mapPosition[0].toFixed(1) + ', ' + player.mapPosition[1].toFixed(1),
				'Mouse Map Position: ' + mouseMapPosition[0].toFixed(1) + ', ' + mouseMapPosition[1].toFixed(1)*/
			]);
		}
	});

	game.afterCycle(function() {
		// Skip all game logic if the game hasn't started yet
		if (!gameStarted) return;
		
		if (livesLeft === 0) {
			detectEnd();
		}
	});

	game.addUIElement(infoBox);
	
	// Set initial player state but don't enable controls yet
	player.isMoving = false;
	player.setDirection(270);

	// Show the start screen and wait for user to click start
	showStartScreen();
	
	// Start the game loop but pause the game until the start button is clicked
	game.start();
	game.pause();
	
	// Check if the game has started every 100ms
	var startCheckInterval = setInterval(function() {
		if (gameStarted) {
			// Reset and start the game
			game.reset();
			clearInterval(startCheckInterval);
		}
	}, 100);
	
	// Set up controls immediately, but they won't do anything until gameStarted is true
	$(mainCanvas)
	.mousemove(function (e) {
		game.setMouseX(e.pageX);
		game.setMouseY(e.pageY);
		player.resetDirection();
		player.startMovingIfPossible();
	})
	.bind('click', function (e) {
		game.setMouseX(e.pageX);
		game.setMouseY(e.pageY);
		player.resetDirection();
		player.startMovingIfPossible();
	})
	.focus(); // So we can listen to events immediately

	Mousetrap.bind('f', player.speedBoost);
	Mousetrap.bind('t', player.attemptTrick);
	Mousetrap.bind(['w', 'up'], function () {
		player.stop();
	});
	Mousetrap.bind(['a', 'left'], function () {
		if (player.direction === 270) {
			player.stepWest();
		} else {
			player.turnWest();
		}
	});
	Mousetrap.bind(['s', 'down'], function () {
		player.setDirection(180);
		player.startMovingIfPossible();
	});
	Mousetrap.bind(['d', 'right'], function () {
		if (player.direction === 90) {
			player.stepEast();
		} else {
			player.turnEast();
		}
	});
	Mousetrap.bind('m', spawnMonster);
	Mousetrap.bind('b', spawnBoarder);
	Mousetrap.bind('space', resetGame);

	var hammertime = Hammer(mainCanvas).on('press', function (e) {
		e.preventDefault();
		game.setMouseX(e.gesture.center.x);
		game.setMouseY(e.gesture.center.y);
	}).on('tap', function (e) {
		game.setMouseX(e.gesture.center.x);
		game.setMouseY(e.gesture.center.y);
	}).on('pan', function (e) {
		game.setMouseX(e.gesture.center.x);
		game.setMouseY(e.gesture.center.y);
		player.resetDirection();
		player.startMovingIfPossible();
	}).on('doubletap', function (e) {
		player.speedBoost();
	});
}

function resizeCanvas() {
	mainCanvas.width = window.innerWidth;
	mainCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas, false);

resizeCanvas();

loadImages(imageSources, startNeverEndingGame);

this.exports = window;
