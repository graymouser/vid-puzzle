/**
 * Created with JetBrains PhpStorm.
 * User: Josh
 * Date: 18/07/12
 * Time: 14:50
 * To change this template use File | Settings | File Templates.
 */

var Dimensions = function(w, h) {
	this.width = w;
	this.height = h;
};

var Rectangle = function () {
	this.x = 0;
	this.y = 0;
	this.width = 0;
	this.height = 0;
};

var Point = function (x, y) {
	this.x = x;
	this.y = y;
};

var Tile = function (x, y, width, height) {
	this.origin = new Point(x, y);
	this.current = new Point(x, y);
	this.width = width;
	this.height = height;
};

Tile.prototype.snapToOriginIfInRange = function (range) {
	if (Math.abs(this.current.x - this.origin.x) > range) return false;
	if (Math.abs(this.current.y - this.origin.y) > range) return false;
	this.current.x = this.origin.x;
	this.current.y = this.origin.y;
	return true;
};

Tile.prototype.inchToOrigin = function (range) {
	if (Math.abs(this.current.x - this.origin.x) < range) this.current.x = this.origin.x;
	else if (this.current.x < this.origin.x) this.current.x += range;
	else this.current.x -= range;
	
	if (Math.abs(this.current.y - this.origin.y) < range) this.current.y = this.origin.y;
	else if (this.current.y < this.origin.y) this.current.y += range;
	else this.current.y -= range;
};

Tile.prototype.isPointInside = function(x, y) {
	return (!(
		x < this.current.x ||
		y < this.current.y ||
		x > (this.current.x + this.width) ||
		y > (this.current.y + this.height)
	));
};



var Puzzle = function () {
	this.curVid = 0;
	this.selTile = -1;
	this.solving = false;
	this.paused = 0;
	this.video = null;
	this.moveOffset = new Point(0,0);

	var v = document.createElement('video');

	if (v.canPlayType('video/webm') != '') this.FILE_EXT = '.webm';
	else if (v.canPlayType('video/mp4') != '') this.FILE_EXT = '.mp4';
	else this.FILE_EXT = '.ogv';
	console.log(this.FILE_EXT);

	this.DEFAULT_VID = "videos/BettyBoopMTM_320x240";

	this.COLOR_TILE = "#4842FF";
	this.COLOR_TILE_SEL = "#58B749";
	this.COLOR_VID = "#2D2D2D";

	this.TILE_SNAP_RANGE = 10;
	this.TILE_SOLVE_RATE = 3;
	this.TILE_DIM_EASY = new Dimensions(80, 80);
	this.TILE_DIM_MEDIUM = new Dimensions(40, 40);
	this.TILE_DIM_HARD = new Dimensions(32, 32);

	this.TILE_DIM = this.TILE_DIM_MEDIUM;

	this.playArea = new Rectangle();
	this.vidArea = new Rectangle();

	this.vidCopyCanvasObject = null;
	this.vidCopyCanvas = null;
	this.canvasObject = null;
	this.canvas = null;

	this.tiles = [];
};

Puzzle.prototype.init = function () {
	this.video = $("#sourceVid")[0];

	this.video.volume = 0;
	this.video.muted = true;
	
	this.canvasObject = $("#outputLayer");

	this.playArea.width = this.video.videoWidth * 2;
	this.playArea.height = this.video.videoHeight * 2;

	this.vidArea.width = this.video.videoWidth;
	this.vidArea.height = this.video.videoHeight;
	this.vidArea.x = (this.playArea.width - this.vidArea.width)/2;
	this.vidArea.y = (this.playArea.height - this.vidArea.height)/2;

	this.canvasObject.attr({
		width: 	this.playArea.width,
		height: this.playArea.height
	}).css({
		width: 	this.playArea.width + 'px',
		height: this.playArea.height + 'px'
	});
	this.canvas = this.canvasObject[0].getContext('2d');

	$('<canvas>').attr({
		id: 'vidCopyCanvas',
		width: 	this.playArea.width,
		height: this.playArea.height
	}).appendTo('#vidDiv');
	this.vidCopyCanvasObject = $("#vidCopyCanvas")[0];
	this.vidCopyCanvas = this.vidCopyCanvasObject.getContext('2d');

	this.createTiles();
	this.scrambleTiles();
};

Puzzle.prototype.bringTileToFront = function(tileIndex) {
	var tile = this.tiles[tileIndex];
	this.tiles.splice(tileIndex, 1);
	this.tiles.push(tile);
};

Puzzle.prototype.pickTile = function(e){
	if (this.paused) return false;

	var maxI = this.tiles.length-1;
	var canvasX = e.pageX - this.canvasObject[0].offsetLeft;
	var canvasY = e.pageY - this.canvasObject[0].offsetTop;

	this.selTile = -1;
	for (var i = maxI; i >= 0; i--) {
		if (this.tiles[i].isPointInside(canvasX, canvasY)) {
			this.selTile = i;
			this.moveOffset.x = canvasX - this.tiles[i].current.x;
			this.moveOffset.y = canvasY - this.tiles[i].current.y;
			break;
		}
	}
	
	if (this.selTile >= 0) {
		this.bringTileToFront(this.selTile);
		this.selTile = maxI;
	}
	
	this.canvasObject.css('cursor', 'pointer');
	return false;
};

Puzzle.prototype.moveTile = function(e) {
	if (this.selTile < 0) return false;
	var tile = this.tiles[this.selTile];
	tile.current.x = e.pageX - this.canvasObject[0].offsetLeft - this.moveOffset.x;
	tile.current.y = e.pageY - this.canvasObject[0].offsetTop - this.moveOffset.y;
	return false;
};

Puzzle.prototype.dropTile = function(e) {
	this.selTile = -1;
	this.canvasObject.css('cursor', 'default');
	return false;
};

Puzzle.prototype.createTiles = function () {
	this.tiles = [];
	var maxX = this.vidArea.x + this.vidArea.width;
	var maxY = this.vidArea.y + this.vidArea.height;

	var y = this.vidArea.y;
	while (y < maxY) {
		var x = this.vidArea.x;
		while (x < maxX) {
			var tile = new Tile(x, y, this.TILE_DIM.width, this.TILE_DIM.height);
			this.tiles.push(tile);
			x += this.TILE_DIM.width;
		}
		y += this.TILE_DIM.height;
	}
};

Puzzle.prototype.scrambleTiles = function () {
	var randomX, randomY;
	for (var i = 0; i < this.tiles.length; i++) {
		randomX = Math.floor(Math.random() * (this.playArea.width - this.TILE_DIM.width));
		randomY = Math.floor(Math.random() * (this.playArea.height - this.TILE_DIM.height));
		this.tiles[i].current.x = randomX;
		this.tiles[i].current.y = randomY;
	}
	return false;
};

Puzzle.prototype.solve = function() {
	this.solving = true;
	return false;
};

Puzzle.prototype.processFrame = function () {
	if (this.paused) return false;
	var tile, selected;
	var solved = true;

	//snapshot current video fame to intermediary canvas
	//NOTE: significant jitter reduction by using intermediary canvas
	this.vidCopyCanvas.drawImage(this.video,0,0, this.vidArea.width, this.vidArea.height,
	this.vidArea.x, this.vidArea.y, this.vidArea.width, this.vidArea.height);

	this.canvas.clearRect(0,0,this.playArea.width, this.playArea.height);

	this.canvas.lineWidth = 1;
	this.canvas.strokeStyle = this.COLOR_VID;
	this.canvas.strokeRect(this.vidArea.x, this.vidArea.y, this.vidArea.width, this.vidArea.height);

	for (var i = 0; i < this.tiles.length; i++) {
		tile = this.tiles[i];
		selected = (this.selTile == i);

		this.canvas.lineWidth = 4;
		this.canvas.strokeStyle = this.COLOR_TILE;
		if (selected) this.canvas.strokeStyle = this.COLOR_TILE_SEL;

		if (!tile.snapToOriginIfInRange(this.TILE_SNAP_RANGE)) {
			if (this.solving && !selected) tile.inchToOrigin(this.TILE_SOLVE_RATE);
			this.canvas.strokeRect(tile.current.x, tile.current.y, this.TILE_DIM.width, this.TILE_DIM.height);
			solved = false;
		}

		this.canvas.drawImage(
			this.vidCopyCanvasObject,
			tile.origin.x, tile.origin.y, this.TILE_DIM.width, this.TILE_DIM.height,
			tile.current.x, tile.current.y, this.TILE_DIM.width, this.TILE_DIM.height
		);
	}
	
	if (this.solving && solved) this.solving = false;
};

Puzzle.prototype.changeDifficulty = function(diffControl) {
	var diffLvl = $(diffControl).html();
	if (diffLvl == "Easy") this.TILE_DIM = this.TILE_DIM_EASY;
	else if (diffLvl == "Medium") this.TILE_DIM = this.TILE_DIM_MEDIUM;
	else this.TILE_DIM = this.TILE_DIM_HARD;
	this.createTiles();
	this.scrambleTiles();
	$('#lblDiff').html(diffLvl);
};

Puzzle.prototype.changeVolume = function(volControl){
	var v = $(volControl).data('vol');
	this.video.muted = (v == 0);
	this.video.volume = (v/10.0);
	$('#lblVol').html($(volControl).html());
};

Puzzle.prototype.changeVid = function(srcControl) {
	this.video.src = $(srcControl).data('vidsrc')+this.FILE_EXT;
	$('#lblVid').html($(srcControl).html());
};

Puzzle.prototype.pause = function() {
	this.paused++;
	this.video.pause();
};

Puzzle.prototype.play = function() {
	this.paused--;
	if (!this.paused) this.video.play();
};

Puzzle.prototype.togglePause = function(pauseControl) {
	if($(pauseControl).html() == "Pause") {
		this.pause();
		$(pauseControl).html('Play');
	} else {
		this.play();
		$(pauseControl).html('Pause');
	}
	return false;
};

function setupPage(p) {
	p.init();

	p.canvasObject.mousedown(function(e){return p.pickTile(e);});
	p.canvasObject.mousemove(function(e){return p.moveTile(e);});
	p.canvasObject.mouseup(function(e){return p.dropTile(e);});

	$('.ctrlSrc').click(function(){p.changeVid(this);});
	$('.ctrlDiff').click(function(){p.changeDifficulty(this);});
	$('#ctrlScramble').click(function(){return p.scrambleTiles();});
	$('#ctrlPause').click(function(){return p.togglePause(this);});
	$('#ctrlSolve').click(function(){return p.solve();});
	$('.ctrlVol').click(function(){p.changeVolume(this);});
	$('#ctrlHelp').click(function(){$('#help').modal();});
	$('#help').on('show', function(){p.pause();})
		.on('hidden', function(){p.play();});

	setInterval(function(){p.processFrame();}, 33);

	$('#sourceVid').off('loadedmetadata');
}

$(function () {
	var puzzle = new Puzzle();

	$('#sourceVid').on('loadedmetadata', function(){
		setupPage(puzzle);
		$('#loadingDiv').hide();
		$('#outputLayer').show();
	});

	$('#sourceVid').attr('src', puzzle.DEFAULT_VID + puzzle.FILE_EXT);
});