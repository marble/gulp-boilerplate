document.addEventListener('click', function (event) {
  'use strict';
	if (!event.target.matches('#click-me')) {
	  return;
  }
	alert('You clicked me!');
}, false);
