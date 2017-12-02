/* global AFRAME, THREE */

/**
*/
AFRAME.registerComponent('track', {
  schema: {
    id: {type: 'string'}
  },
  
  init: function () {
    this.onGrab = this.onGrab.bind(this);
    this.onGrabEnd = this.onGrabEnd.bind(this);
  },

  play: function () {
    var el = this.el;
    el.addEventListener('grab', this.onGrab);
    el.addEventListener('grabend', this.onGrabEnd);
  },

  pause: function () {
    var el = this.el;
    el.removeEventListener('grab', this.onGrab);
    el.removeEventListener('grabend', this.onGrabEnd);
  },

  onGrab: function (evt) {
    event.detail.hand.setAttribute('brush', {
      enabled: true,
      color: this.el.getAttribute('material').color
    });
    this.el.sceneEl.systems.painter.trackStartTimes[this.data.id] = Date.now();    
    this.playSound();
  },
  
  playSound() {
    // TODO: handle multiple plays of same track
    var sound = this.el.components.sound;
    // Hack: we know poolSize is always 0.
    // All tracks have something at 61 seconds.
    // NOTE: In the newest version of Three.js, startTime is renamed to offset!
    sound.pool.children[0].startTime = 61;
    sound.playSound();
  },
  
  onGrabEnd: function (evt) {
    event.detail.hand.setAttribute('brush', {enabled: false});
    
    this.el.components.sound.pause();
  }
});
