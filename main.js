// Variables qui nous permettront de savoir quand le jeu dÃ©marre ou quand il y a un GAME OVER
var GAME_START = false;
var GAME_OVER = false;

// Taille du jeu (mode portrait)
const width = 1080;
const height = 1775;

// Phaser
var game = new Phaser.Game(width, height, Phaser.AUTO, 'timberman');
game.transparent = true;

// On dÃ©clare un objet qui contiendra les Ã©tats "load" et "main"
var gameState = {};
gameState.load = function() { };
gameState.main = function() { };

// Va contenir le code qui chargera les ressources
gameState.load.prototype = {
	preload: function() {
		// Chargement de l'image du background
		game.load.image('background', 'img/background.png');
		// Chargement du personnage - PNG et JSON
		game.load.atlas('man', 'img/man.png', 'data/man.json');
		// Arbre
		game.load.image('trunk1', 'img/trunk1.png');
		game.load.image('trunk2', 'img/trunk2.png');
		game.load.image('branchLeft', 'img/branch1.png');
		game.load.image('branchRight', 'img/branch2.png');
		game.load.image('stump', 'img/stump.png');
		// Chiffres pour le score
		game.load.atlas('numbers', 'img/numbers.png', 'data/numbers.json');
		// Temps
		game.load.image('timeContainer', 'img/time-container.png');
		game.load.image('timeBar', 'img/time-bar.png');
		// Niveaux
		game.load.atlas('levelNumbers', 'img/levelNumbers.png', 'data/numbers.json');
		game.load.image('level', 'img/level.png');
		// tombe rip
		game.load.image('rip', 'img/rip.png');

		/**** SONS *****/
		// Coup de hache
		game.load.audio('soundCut', ['sons/cut.ogg']);
		// Musique de fond
		game.load.audio('soundTheme', ['sons/theme.ogg']);
		// Mort du personnage
		game.load.audio('soundDeath', ['sons/death.ogg']);
	},

	create: function() {
		game.state.start('main');
	}
};

// va contenir le coeur du jeu
gameState.main.prototype = {
	create: function() {
		// Physique du jeu
		game.physics.startSystem(Phaser.Physics.ARCADE);

		// On fait en sorte que le jeu se redimensionne selon la taille de l'Ã©cran (Pour les PC)
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.scale.setShowAll();
		window.addEventListener('resize', function () {
			game.scale.refresh();
		});
		game.scale.refresh();

		// CrÃ©ation de l'arriÃ¨re-plan dans le Canvas
		this.background = game.add.sprite(0, 0, 'background');
		this.background.width = game.width;
		this.background.height = game.height;

		// ---- ARBRE
		// souche
		this.stump = game.add.sprite(0, 0, 'stump');
		this.stump.x = 352;
		this.stump.y = 1394;
		// construction de l'arbre
		this.HEIGHT_TRUNK = 243;
		this.constructTree();
		this.canCut = true;

		// ---- BÃ›CHERON
		// CrÃ©ation du bÃ»cheron
		this.man = game.add.sprite(0, 1070, 'man');
		// On ajoute l'animation de la respiration (fait appel au JSON)
		this.man.animations.add('breath', [0,1]);
		// On ajoute l'animation de la coupe (fait appel au JSON)
		this.man.animations.add('cut', [1,2,3,4]);
		// On fait dÃ©marrer l'animation, avec 3 images par seconde et rÃ©pÃ©tÃ©e en boucle
		this.man.animations.play('breath', 3, true);
		// Position du bÃ»cheron
		this.manPosition = 'left';

		// Au click, on appelle la fonction "listener()"
		game.input.onDown.add(this.listener, this);

		// ---- SCORE
		this.currentScore = 0;
		// On crÃ©e le sprite du score
		var spriteScoreNumber = game.add.sprite(game.width / 2, 440, 'numbers');
		// On affiche le score Ã  0 en ajoutant le JSON "number" aux animations de "spriteScoreNumber"
		spriteScoreNumber.animations.add('number');
		spriteScoreNumber.animations.frame = this.currentScore;
		// On centre le score
		spriteScoreNumber.x -= spriteScoreNumber.width / 2;
		// "this.spritesScoreNumbers" va contenir les sprites des chiffres qui composent le score
		this.spritesScoreNumbers = new Array();
		this.spritesScoreNumbers.push(spriteScoreNumber);

		// ---- BARRE DE TEMPS
		// Container
		this.timeContainer = game.add.sprite(0, 100, 'timeContainer');
		// On le centre
		this.timeContainer.x = game.width / 2 - this.timeContainer.width / 2;
		// Barre
		this.timeBar = game.add.sprite(0, 130, 'timeBar');
		// On la centre
		this.timeBar.x = game.width / 2 - this.timeBar.width / 2;
		this.timeBarWidth = this.timeBar.width / 2;
		// On crop la barre pour la diminuer de moitiÃ©
		var cropRect = new Phaser.Rectangle(0, 0, this.timeBarWidth, this.timeBar.height);
		this.timeBar.crop(cropRect);
		this.timeBar.updateCrop();

		// ---- NIVEAU
		// Level
		this.currentLevel = 1;
		var levelPosY = 290;
		// Sprite "Level"
		this.intituleLevel = game.add.sprite(0, levelPosY, 'level');
		this.intituleLevel.alpha = 0;
		// Sprite "NumÃ©ro du level"
		var spriteLevelNumber = game.add.sprite(0, levelPosY, 'levelNumbers');
		spriteLevelNumber.alpha = 0;
		// On change l'animation du sprite pour chosir le sprite du niveau actuel (ici, niveau 1)
		spriteLevelNumber.animations.add('number');
		spriteLevelNumber.animations.frame = this.currentLevel;
		this.spritesLevelNumbers = new Array();
		this.spritesLevelNumbers.push(spriteLevelNumber);

		// ---- SONS
		this.soundCut = game.add.audio('soundCut', 1);
		this.soundTheme = game.add.audio('soundTheme', 0.5, true);
		this.soundDeath = game.add.audio('soundDeath', 1);
	},

	update: function() {
		// Si le partie a dÃ©butÃ© (premiÃ¨re action du joueur)
		if(GAME_START) {
			// S'il reste du temps, mise Ã  jour de la barre de temps
			if(this.timeBarWidth > 0) {
				// On diminue la barre de temps en fonction du niveau
				this.timeBarWidth -= (0.6 + 0.1 * this.currentLevel);
				var cropRect = new Phaser.Rectangle(0, 0, this.timeBarWidth, this.timeBar.height);
				this.timeBar.crop(cropRect);
				this.timeBar.updateCrop();
			// Sinon, le personnage meurt
			} else {
				this.death();
			}
		}
		// Si la partie n'est pas terminÃ©e
		if(!GAME_OVER) {
			// DÃ©tection des touches left et right du clavier
			if (game.input.keyboard.justPressed(Phaser.Keyboard.LEFT))
		        this.listener('left');
		    else if (game.input.keyboard.justPressed(Phaser.Keyboard.RIGHT)) {
		        this.listener('right');
		    }
		}
	},

	listener: function(action) {

		if(this.canCut) {

			// La premiÃ¨re action de l'utilisateur dÃ©clenche le dÃ©but de partie
			if(!GAME_START) {
				GAME_START = true;
				// On active la musique de fond
				this.soundTheme.play();
			}
			
			// On vÃ©rifie si l'action du joueur est un clic
			var isClick = action instanceof Phaser.Pointer;

			// Si la touche directionnelle gauche est pressÃ©e ou s'il y a un clic dans la moitiÃ© gauche du jeu
			if(action == 'left' || (isClick && game.input.activePointer.x <= game.width / 2)) {
				// On remet le personnage Ã  gauche de l'arbre et dans le sens de dÃ©part
				this.man.anchor.setTo(0, 0);
				this.man.scale.x = 1;
				this.man.x = 0;
				this.manPosition = 'left';
			// Si la touche directionnelle droite est pressÃ©e ou s'il y a un clic dans la moitiÃ© droite du jeu
			} else {
				// On inverse le sens du personnage pour le mettre Ã  droite de l'arbre
				this.man.anchor.setTo(1, 0);
				this.man.scale.x = -1;
				this.man.x = game.width - Math.abs(this.man.width);
				this.manPosition = 'right';
			}

			// On stop l'animation de respiration
			this.man.animations.stop('breath', true);
			// Pour dÃ©marrer l'animation de la coupe, une seule fois et avec 3 images par seconde
			var animationCut = this.man.animations.play('cut', 15);
			// Une fois que l'animation de la coupe est finie, on reprend l'animation de la respiration
			animationCut.onComplete.add(function() {
				this.man.animations.play('breath', 3, true);
			}, this);

			// Nom du tronc Ã  couper
			var nameTrunkToCut = this.tree.getAt(0).key;
			// Nom du tronc qui se trouve juste au-dessus du tronc "nameTrunkToCut"
			var nameTrunkJustAfter = this.tree.getAt(1).key;

			// Si le personnage heurte une branche alors qu'il vient de changer de cÃ´tÃ©
			if(nameTrunkToCut == 'branchLeft' && this.manPosition == 'left' || nameTrunkToCut == 'branchRight' && this.manPosition == 'right') {
				// Game Over
				this.death();
			// Si tout va bien, le personnage coupe le tronc
			} else {
				this.man.animations.stop('breath', true);
				// On fait dÃ©marrer l'animation, avec 3 images par seconde
				var animationCut = this.man.animations.play('cut', 15);
				animationCut.onComplete.add(function() {
					this.man.animations.play('breath', 3, true);
				}, this);

				this.cutTrunk();

				// Une fois le tronc coupÃ©, on vÃ©rifie si le tronc qui retombe n'est pas une branche qui pourrait heurter le personnage
				if(nameTrunkJustAfter == 'branchLeft' && this.manPosition == 'left' || nameTrunkJustAfter == 'branchRight' && this.manPosition == 'right') {
					// Game Over
					this.death();
				}
			}
		}
	},

	cutTrunk: function() {
		
		// On active le son de hache contre le bois
		this.soundCut.stop();
		this.soundCut.play();

		// On incrÃ©mente le score
		this.increaseScore();

		// On ajoute un tronc ou une branche		
		this.addTrunk();

		// On crÃ©e une copie du morceau de l'arbre qui doit Ãªtre coupÃ©
		var trunkCut = game.add.sprite(37, 1151, this.tree.getAt(0).key);
		trunkCut.outOfBoundsKill = true;
		// Et on supprime le morceau appartenant Ã  l'arbre 
		this.tree.remove(this.tree.getAt(0));
		// On active le systÃ¨me de physique sur ce sprite
		game.physics.enable(trunkCut, Phaser.Physics.ARCADE);
		// On dÃ©place le centre de gravitÃ© du sprite en son milieu, ce qui nous permettra de lui faire faire une rotation sur lui mÃªme
		trunkCut.anchor.setTo(0.5, 0.5);
		trunkCut.x += trunkCut.width / 2;
		trunkCut.y += trunkCut.height / 2;

		var angle = 0;
		// Si le personnage se trouve Ã  gauche, on envoie le morceau de bois vers la droite
		if(this.manPosition == 'left') {
			trunkCut.body.velocity.x = 1300;
			angle = -400;
		// Sinon, on l'envoie vers la gauche
		} else {
			trunkCut.body.velocity.x = -1300;
			angle = 400;
		}
		// Permet de crÃ©er un effet de gravitÃ©
		// Dans un premier temps, le morceau de bois est propulsÃ© en l'air
		trunkCut.body.velocity.y = -800;
		// Et dans un second temps, il retombe
		trunkCut.body.gravity.y = 2000;

		// On ajoute une animation de rotation sur le morceau de bois coupÃ©
		game.add.tween(trunkCut).to({angle: trunkCut.angle + angle}, 1000, Phaser.Easing.Linear.None,true);

		// On empÃªche une nouvelle coupe
		this.canCut = false;

		var self = this;
		// Pour chaque morceau (troncs et branches) de l'arbre, on lui ajoute une animation de chute.
		// Donne l'impression que tout l'arbre tombe pour boucher le trou laissÃ© par le morceau coupÃ©.
		this.tree.forEach(function(trunk) {
			var tween = game.add.tween(trunk).to({y: trunk.y + self.HEIGHT_TRUNK}, 100, Phaser.Easing.Linear.None,true);
			tween.onComplete.add(function() {
				// Une fois que l'arbre Ã  fini son animation, on redonne la possibilitÃ© de couper
				self.canCut = true;
			}, self);
		});
	},

	constructTree: function() {
		// On construit le groupe this.tree qui va contenir toutes les parties de l'arbre (troncs simple et branches)
		this.tree = game.add.group();
		// Les 2 premiers troncs sont des troncs simples
		this.tree.create(37, 1151, 'trunk1');
		this.tree.create(37, 1151 - this.HEIGHT_TRUNK, 'trunk2');

		// On construit le reste de l'arbre
		for(var i = 0; i < 4; i++) {
			this.addTrunk();
		}
	},

	addTrunk: function() {
		var trunks = ['trunk1', 'trunk2'];
		var branchs = ['branchLeft', 'branchRight'];
		// Si le dernier tronc du groupe this.tree n'est pas une branche
		if(branchs.indexOf(this.tree.getAt(this.tree.length - 1).key) == -1) {
			// 1 chance sur 4 de placer un tronc sans branche
			if(Math.random() * 4 <= 1)
				this.tree.create(37, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), trunks[Math.floor(Math.random() * 2)]);
			// 3 chances sur 4 de placer une branche
			else	
				this.tree.create(37, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), branchs[Math.floor(Math.random() * 2)]);
		}
		// Si le tronc prÃ©cÃ©dent est une branche, on place un tronc simple
		else
			this.tree.create(37, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), trunks[Math.floor(Math.random() * 2)]);
	},

	increaseScore: function() {
		this.currentScore++;

		// Tous les 20 points, on augmente le niveau
		if(this.currentScore % 20 == 0)
			this.increaseLevel();

		// On ajoute un peu de temps supplÃ©mentaire
		this.timeBarWidth += 12;

		// On "kill" chaque sprite (chaque chiffre) qui compose le score
		for(var j = 0; j < this.spritesScoreNumbers.length; j++)
			this.spritesScoreNumbers[j].kill();
		this.spritesScoreNumbers = new Array();
		
		// On recrÃ©e les sprites qui vont composer le score
		this.spritesScoreNumbers = this.createSpritesNumbers(this.currentScore, 'numbers', 440, 1);
	},

	createSpritesNumbers: function(number /* Nombre Ã  crÃ©er en sprite */, imgRef /* Image Ã  utiliser pour crÃ©er le score */, posY, alpha) {
		// on dÃ©coupe le nombre en des chiffres individuels
		var digits = number.toString().split('');
		var widthNumbers = 0;

		var arraySpritesNumbers = new Array();
		
		// on met en forme le nombre avec les sprites
		for(var i = 0; i < digits.length; i++) {
			var spaceBetweenNumbers = 0;
			if(i > 0)
				spaceBetweenNumbers = 5;
			var spriteNumber = game.add.sprite(widthNumbers + spaceBetweenNumbers, posY, imgRef);
			spriteNumber.alpha = alpha;
			// On ajoute le JSON des nombres dans l'animation de "spriteNumber"
			spriteNumber.animations.add('number');
			// On sÃ©lection la frame nÂ° "digits[i]" dans le JSON
			spriteNumber.animations.frame = +digits[i];
			arraySpritesNumbers.push(spriteNumber);
			// On calcule la width totale du sprite du score
			widthNumbers += spriteNumber.width + spaceBetweenNumbers;
		}

		// On ajoute les sprites du score dans le groupe "numbersGroup" afin de centrer le tout
		var numbersGroup = game.add.group();
		for(var i = 0; i < arraySpritesNumbers.length; i++)
			numbersGroup.add(arraySpritesNumbers[i]);
		// On centre horizontalement
		numbersGroup.x = game.width / 2 - numbersGroup.width / 2;

		return arraySpritesNumbers;
	},

	increaseLevel: function() {
		// On incrÃ©mente le niveau actuel
		this.currentLevel++;

		// On "kill" chaque sprite (chaque chiffre) du numÃ©ro du prÃ©cÃ©dent niveau
		for(var j = 0; j < this.spritesLevelNumbers.length; j++)
			this.spritesLevelNumbers[j].kill();
		this.spritesLevelNumbers = new Array();

		// On crÃ©e les sprites (sprites des chiffres) du niveau actuel
		this.spritesLevelNumbers = this.createSpritesNumbers(this.currentLevel, 'levelNumbers', this.intituleLevel.y, 0);

		// On positionne le numÃ©ro du niveau (composÃ© de diffÃ©rents sprites) derriÃ¨re le sprite "level"
		this.intituleLevel.x = 0;
		for(var i = 0; i < this.spritesLevelNumbers.length; i++) {
			if(i == 0)
				this.spritesLevelNumbers[i].x = this.intituleLevel.width + 20;
			else
				this.spritesLevelNumbers[i].x = this.intituleLevel.width + 20 + this.spritesLevelNumbers[i - 1].width;
		}
		// On ajoute le tout Ã  un groupe afin de tout centrer
		var levelGroup = game.add.group();
		levelGroup.add(this.intituleLevel);
		for(var i = 0; i < this.spritesLevelNumbers.length; i++)
			levelGroup.add(this.spritesLevelNumbers[i]);
		levelGroup.x = game.width / 2 - levelGroup.width / 2;

		// On fait apparaÃ®tre le sprite "level" et le numÃ©ro du niveau en mÃªme temps
		for(var i = 0; i < this.spritesLevelNumbers.length; i++) {
			game.add.tween(this.spritesLevelNumbers[i]).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);
		}
		game.add.tween(this.intituleLevel).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);

		// On fait disparaÃ®tre le tout au bout de 1.5 secondes
		var self = this;
		setTimeout(function() {
			for(var i = 0; i < self.spritesLevelNumbers.length; i++) {
				game.add.tween(self.spritesLevelNumbers[i]).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
			}
			game.add.tween(self.intituleLevel).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
		}, 1500);
	},

	death: function() {
		// On joue le son de la mort du personnage
		this.soundDeath.play();
		// Et on stop la musique de fond
		this.soundTheme.stop();

		// On empÃªche toute action du joueur
		GAME_START = false;
		GAME_OVER = true;
		this.canCut = false;
		game.input.onDown.removeAll();

		var self = this;
		// On fait disparaÃ®tre le personnage
		var ripTween = game.add.tween(this.man).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
		// Une fois la disparition complÃ¨te
		ripTween.onComplete.add(function() {
			// On fait apparaÃ®tre la tombe Ã  la place du personnage
			self.rip = game.add.sprite(0, 0, 'rip');
			self.rip.alpha = 0;
			game.add.tween(self.rip).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);
			self.rip.x = (this.manPosition == 'left') ? (this.man.x + 50) : (this.man.x + 200);
			self.rip.y = this.man.y + this.man.height - self.rip.height;
			// AprÃ¨s 1 seconde, on fait appel Ã  la fonction "gameFinish()"
			setTimeout(function() {self.gameFinish()}, 1000);
		}, this);
	},

	gameFinish: function() {
		// On redÃ©marre la partie
		GAME_START = false;
		GAME_OVER = false;
		game.state.start('main');
	}
};


// On ajoute les 2 fonctions "gameState.load" et "gameState.main" Ã  notre objet Phaser
game.state.add('load', gameState.load);
game.state.add('main', gameState.main);
// Il ne reste plus qu'Ã  lancer l'Ã©tat "load"
game.state.start('load');