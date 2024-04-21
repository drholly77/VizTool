let sidenav
let sidenav_open

function set_up_sidenav() {
   set_up_switches()
   let bsDefaults = {
         offset: false,
         overlay: true,
         width: '330px'
      },
      bsMain = $('.bs-offset-main'),
      bsOverlay = $('.bs-canvas-overlay');

   $('[data-toggle="canvas"][aria-expanded="false"]').on('click', function () {
      let canvas = $(this).data('target'),
         opts = $.extend({}, bsDefaults, $(canvas).data()),
         prop = $(canvas).hasClass('bs-canvas-right') ? 'margin-right' : 'margin-left';

      if (opts.width === '100%')
         opts.offset = false;

      $(canvas).css('width', opts.width);
      if (opts.offset && bsMain.length)
         bsMain.css(prop, opts.width);

      $(canvas + ' .bs-canvas-close').attr('aria-expanded', "true");
      $('[data-toggle="canvas"][data-target="' + canvas + '"]').attr('aria-expanded', "true");
      if (opts.overlay && bsOverlay.length)
         bsOverlay.addClass('show');
      return false;
   });

   $('.bs-canvas-close, .bs-canvas-overlay').on('click', function () {
      let canvas, aria;
      if ($(this).hasClass('bs-canvas-close')) {
         canvas = $(this).closest('.bs-canvas');
         aria = $(this).add($('[data-toggle="canvas"][data-target="#' + canvas.attr('id') + '"]'));
         if (bsMain.length)
            bsMain.css(($(canvas).hasClass('bs-canvas-right') ? 'margin-right' : 'margin-left'), '');
      } else {
         canvas = $('.bs-canvas');
         aria = $('.bs-canvas-close, [data-toggle="canvas"]');
         if (bsMain.length)
            bsMain.css({
               'margin-left': '',
               'margin-right': ''
            });
      }
      canvas.css('width', '');
      aria.attr('aria-expanded', "false");
      if (bsOverlay.length)
         bsOverlay.removeClass('show');
      return false;
   });
}

function set_up_switches() {
   let old_bad_wrong_answer_color
   let old_good_wrong_answer_color
   let old_right_answer_color
   const red_green = document.querySelector('#red-green')
   red_green.change = () => {
      if (red_green.checked) {
         old_bad_wrong_answer_color = bad_wrong_answer_color
         bad_wrong_answer_color = '#b59700'
         old_good_wrong_answer_color = good_wrong_answer_color
         good_wrong_answer_color = '#ffd500'
         old_right_answer_color = right_answer_color
         right_answer_color = '#6969ff'
      } else {
         bad_wrong_answer_color = old_bad_wrong_answer_color
         good_wrong_answer_color = old_good_wrong_answer_color
         right_answer_color = old_right_answer_color
      }
      reload_colors()
   }

   const labels = document.querySelector('#labels')
   labels.change = () => {
      updateAnswerLabels(labels.checked)
   }
   labels.checked = 1
}

function set_up_color_key() {
   array_of_tuples = []
   nodes.forEach((d) => {
      if (d.name != "Start") {
         const pos = xForce(d) / width
         array_of_tuples.push([pos, color(d)])
      }
   })
   array_of_tuples.sort((a, b) => a[0] - b[0])

   let gradient_string = "linear-gradient(to right,"

   array_of_tuples.forEach(([pos, color]) => {
      gradient_string += `${color} ${pos * 100}%,`
   })
   document.querySelector('#colorKey').style.backgroundImage = gradient_string.slice(0, -1) + ")"

   // Move the labels
   let correct_found = false
   let gave_up_found = false
   let incorrect_found = false
   nodes.forEach((d) => {
      if (d.score > 1) {
         correct_found = true
      } else if (d.score >= 0) {
         incorrect_found = true
      } else {
         gave_up_found = true
      }
   })
   document.querySelector('#correct').style.display = correct_found ? 'initial' : 'none'
   document.querySelector('#incorrect').style.display = incorrect_found ? 'initial' : 'none'
   document.querySelector('#gaveup').style.display = gave_up_found ? 'initial' : 'none'
}
