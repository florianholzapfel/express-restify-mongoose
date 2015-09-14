$('#nav').affix({
  offset: {
    top: $('#nav').offset().top,
    bottom: $('footer').outerHeight(true) + 40
  }
})
