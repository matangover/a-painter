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
    this.el.sceneEl.systems['playback-controls'].paintTrack(this.el);
  },
  
  onGrabEnd: function (evt) {
    event.detail.hand.setAttribute('brush', {enabled: false});
    this.el.sceneEl.systems['playback-controls'].stopPaintingTrack(this.el);
  }
});
