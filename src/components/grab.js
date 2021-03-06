/* global AFRAME, THREE */

/**
* Handles events coming from the hand-controls.
* Determines if the entity is grabbed or released.
* Updates its position to move along the controller.
*/
AFRAME.registerComponent('grab', {
  init: function () {
    this.GRABBED_STATE = 'grabbed';
    // Bind event handlers
    this.onHit = this.onHit.bind(this);
    this.onToggleGrab = this.onToggleGrab.bind(this);
  },

  play: function () {
    var el = this.el;
    el.addEventListener('hit', this.onHit);
    el.addEventListener('togglegrab', this.onToggleGrab);
  },

  pause: function () {
    var el = this.el;
    el.removeEventListener('hit', this.onHit);
    el.removeEventListener('togglegrab', this.onToggleGrab);
  },

  onToggleGrab: function (evt) {
    // console.log("TOGGLE GRAB");
    if (!this.grabbing) {
      this.grabbing = true;
      delete this.previousPosition;
    } else {
      var hitEl = this.hitEl;
      this.grabbing = false;
      if (!hitEl) { return; }
      hitEl.removeState(this.GRABBED_STATE);
      hitEl.emit('grabend', {hand: this.el});
      this.hitEl = undefined;    
    }
  },

  onHit: function (evt) {
    var hitEl = evt.detail.el;
    // If the element is already grabbed (it could be grabbed by another controller).
    // If the hand is not grabbing the element does not stick.
    // If we're already grabbing something you can't grab again.
    if (!hitEl || hitEl.is(this.GRABBED_STATE) || !this.grabbing || this.hitEl) { return; }
    hitEl.addState(this.GRABBED_STATE);
    this.hitEl = hitEl;
    hitEl.emit('grab', {hand: this.el});
  },

  tick: function () {
    var hitEl = this.hitEl;
    var position;
    if (!hitEl) { return; }
    // this.updateDelta();
    position = hitEl.getAttribute('position');
    // hitEl.setAttribute('position', {
    //   x: position.x + this.deltaPosition.x,
    //   y: position.y + this.deltaPosition.y,
    //   z: position.z + this.deltaPosition.z
    // });
    
    
    // var position = new THREE.Vector3();
    // var rotation = new THREE.Quaternion();
    // var scale = new THREE.Vector3();
    // 
    // return function tick (time, delta) {
    //   if (this.currentStroke && this.active) {
    //     this.obj.matrixWorld.decompose(position, rotation, scale);
    //     var pointerPosition = this.system.getPointerPosition(position, rotation);

    // hitEl.setAttribute('position', this.el.getAttribute('position')hitEl.sceneEl.systems.brush.getPointerPosition());
    var worldPos = new THREE.Vector3();
    worldPos.setFromMatrixPosition(this.el.object3D.matrixWorld);
    hitEl.setAttribute('position', worldPos);

    // hitEl.setAttribute('position', this.el.getAttribute('position'));
  },

  updateDelta: function () {
    // TODO: handle teleport while grabbing
    var currentPosition = this.el.getAttribute('position');
    if (!this.previousPosition) {
      this.previousPosition = new THREE.Vector3();
      this.previousPosition.copy(currentPosition);
    }
    var previousPosition = this.previousPosition;
    var deltaPosition = {
      x: currentPosition.x - previousPosition.x,
      y: currentPosition.y - previousPosition.y,
      z: currentPosition.z - previousPosition.z
    };
    this.previousPosition.copy(currentPosition);
    this.deltaPosition = deltaPosition;
  }
});
