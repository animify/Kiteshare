const remote = require('electron').remote
const app = remote.app
const cropWindow = remote.getCurrentWindow()

const os = require('os')
const path = require('path')

const Jimp = require('jimp')

$(() => {
	cropWindow.on('blur', () => cropWindow.destroy())

	const imagePath = decodeURIComponent(window.location.href.split('?image_path=')[1])

	$('.img').attr('src', imagePath)

	$('.img').css({
		'position' : 'fixed',
		'top' : 0,
		'left' : 0
	})

	$('.img').load(() => {
		cropWindow.show()
		cropWindow.focus()
	})

	$(document).keyup(e => e.keyCode == 27 && cropWindow.destroy())

	let dragging = false
	let mouseLoc = {x: 0, y: 0}
	let dragStart = {x: 0, y: 0}
	let dragSize = {x: 0, y: 0}
	let dragEnd = {x: 0, y: 0}
	let scale = {x: 1, y: 1}
	let clip = {x: 0, x2: 0, y: 0, y2: 0}

	$(window).on('mousemove', e => {
		mouseLoc.x = e.clientX
		mouseLoc.y = e.clientY

		if (mouseLoc.x > $(document).width()) mouseLoc.x = $(document).width()
		if (mouseLoc.y > $(document).height()) mouseLoc.y = $(document).height()

		if (mouseLoc.x < 0) mouseLoc.x = 0
		if (mouseLoc.y < 0) mouseLoc.y = 0

		scale.x = $('.img')[0].naturalWidth / $('.img').width()
		scale.y = $('.img')[0].naturalHeight / $('.img').height()

		$('#cords').css({
			top: mouseLoc.y,
			left: mouseLoc.x
		})

		if (dragging) {
			dragSize.x = Math.abs(mouseLoc.x - dragStart.x) + 1
			dragSize.y = Math.abs(mouseLoc.y - dragStart.y) + 1
			clip.y2 = mouseLoc.y
			clip.x2 = mouseLoc.x

			if (mouseLoc.y < dragStart.y) {
				clip.y = mouseLoc.y
				clip.y2 = mouseLoc.y + dragSize.y
			}

			if (mouseLoc.x < dragStart.x) {
				clip.x = mouseLoc.x
				clip.x2 = mouseLoc.x + dragSize.x
			}

			$(".overlayer").css('clip', `rect(${clip.y}px,${clip.x2}px,${clip.y2}px,${clip.x}px)`)
		}

		$('#cords').html(Math.round(mouseLoc.x * scale.x) + '<br />' + Math.round(mouseLoc.y * scale.y))
	})

	// start cropping
	$(window).on('mousedown', e => {
		dragging = true

		clip.x = mouseLoc.x
		clip.y = mouseLoc.y
		dragStart.x = mouseLoc.x
		dragStart.y = mouseLoc.y
		dragSize.x = 0
		dragSize.y = 0
		dragEnd.x = 0
		dragEnd.y = 0

		$(".overlayer").css('clip', `rect(${clip.y}px,${clip.x}px,${clip.y}px,${clip.x}px)`)

		$('.overlayer').show()
	})

	// stop cropping
	$(window).on('mouseup', e => {
		if (!dragging) return
		dragging = false

		dragEnd.x = mouseLoc.x + 1
		dragEnd.y = mouseLoc.y + 1

		dragSize.x = Math.abs(mouseLoc.x - dragStart.x) + 1
		dragSize.y = Math.abs(mouseLoc.y - dragStart.y) + 1

		$('.overlayer').hide()

		// dont upload if the crop is 0
		if (dragSize.x <= 1 && dragSize.y <= 1) {
			cropWindow.destroy()
		} else {
			let left = dragEnd.x > dragStart.x ? dragStart.x : dragEnd.x
			let top = dragEnd.y > dragStart.y ? dragStart.y : dragEnd.y
			left = left * scale.x
			top = top * scale.y

			const width = dragSize.x * scale.x
			const height = dragSize.y * scale.y

			// crop and save img. main script looks for the cropped file on window closed
			Jimp.read(imagePath, (error, image) => {
				if (error) return

				image.crop(left, top, width, height)

				image.write(imagePath, () => cropWindow.close())
			})
		}
	})
})
