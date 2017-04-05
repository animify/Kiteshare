// windows start menu add/delete /w squirrel install/uninstall
if(require('electron-squirrel-startup')) return

const os = require('os')
const path = require('path')
const fs = require('fs')
const execFile = require('child_process').execFile

const request = require('request')
const async = require('async')
const trash = require('trash')

const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const Tray = electron.Tray
const Menu = electron.Menu
const MenuItem = electron.MenuItem
const NativeImage = electron.nativeImage
const globalShortcut = electron.globalShortcut
const clipboard = electron.clipboard
const shell = electron.shell
const ipc = electron.ipcMain
const dialog = electron.dialog
// const client = require('electron-connect').client

const Settings = require('./settings')
const Services = require('./services')

const electronDebug = require('electron-debug')()

const getTrayImage = (state=null, template=false) => {
	if (!state && os.platform() === 'win32') state = 'alt'
	if (template) {
		const trayImg = NativeImage.createFromPath(getTrayImage())
		trayImg.setTemplateImage(true)
		return trayImg
	}
	return path.join(app.getAppPath(), 'img', `menu-${state ? `${state}-` : ''}icon@2x.png`)
}

class Kiteshare {
	constructor() {
		this.platform = os.platform()
		this.name = app.getName()
		this.version = app.getVersion()
		this.recent = []

		this.settingsWindow = null
		this.workerWindow = null
		this.cropWindow = null

		this.workerWindow = new BrowserWindow({show: false})
		this.workerWindow.loadURL(`file://${path.join(app.getAppPath(), 'worker-window.html')}`)

		this.workerWindow.webContents.on('did-finish-load', () => {
			this.settings = new Settings()
			this.services = new Services(this.settings)
			this.recent = this.settings.get("recent")

			this.watch()
			this.buildTrayMenu()
			this.firstLaunch()
			this.checkUpdates()
		})

		if (this.platform == 'darwin') app.dock.hide()

		app.on('activate', () => this.showSettingsWindow())

		app.on('window-all-closed', () => {
			this.settingsWindow = null
			this.workerWindow = null
			this.cropWindow = null
		})

		app.on('will-quit', () => globalShortcut.unregisterAll())

		this.tray = new Tray(getTrayImage(null, true))
		this.tray.setPressedImage(getTrayImage('alt'))
	}

	firstLaunch() {
		if (this.settings.get('lastVersionLaunched') === this.version) return
		this.showSettingsWindow()
		this.settings.set('lastVersionLaunched', this.version)
		this.settings.save()
	}

	checkUpdates() {
		if (!this.settings.get('checkForUpdates')) return

		request.get({
			url: 'https://pussh.me/dl/kiteshare.json',
			timeout: 10000,
			json: true
		}, (error, response, body) => {
			if (error || !response || response.statusCode !== 200 || !data.version) return

			if (this.version !== data.version) {
				const msg = 'Kiteshare has an update available. Click "OK" to open the Kiteshare download page.'
				if (!confirm(msg)) return
				this.openInBrowser('https://pussh.me/')
			}
		})
	}

	showSettingsWindow() {
		if (this.settingsWindow) {
			this.settingsWindow.focus()
			return
		}

		this.settingsWindow = new BrowserWindow({
			frame: false,
			show: false,
			width: 900,
			height: 600,
			minWidth: 900,
			minHeight: 580,
			skipTaskbar: true,
			autoHideMenuBar: true
		})

		// client.create(this.settingsWindow)
		this.settingsWindow.setMenu(null)
		this.settingsWindow.loadURL(`file://${path.join(app.getAppPath(), 'settings-window.html')}`)
		this.settingsWindow.on('closed', () => this.settingsWindow = null)
		this.settingsWindow.webContents.on('did-finish-load', () => this.settingsWindow.show())
	}

	setTrayState(state) {
		switch(state) {
			case 'off':
				this.tray.setImage(getTrayImage(null, true))
				break
			case 'active':
				this.tray.setImage(getTrayImage('active'))
				break
			case 'complete':
				this.tray.setImage(getTrayImage('done'))
				break
		}
	}

	buildTrayMenu() {
		const menu = new Menu()

		if (this.recent.length) {
			this.recent.forEach(url => {
				menu.append(new MenuItem({
					label: url,
					click: () => this.copyToClipboard(url) && this.openInBrowser(url)
				}))
			})

			menu.append(new MenuItem({
				type: 'separator'
			}))
		}

		menu.append(new MenuItem({
			label: 'Crop and Copy',
			click: () => {
				switch(this.platform) {
					case 'darwin':
						execFile('/usr/bin/osascript', ['-e', 'tell application "System Events" to keystroke "$" using {command down, shift down}'])
						break
					case 'win32':
						this.windowsCapture(true, true)
						break
				}
			}
		}))

		menu.append(new MenuItem({
			label: 'Crop and Upload',
			click: () => {
				switch(this.platform) {
					case 'darwin':
						execFile('/usr/bin/osascript', ['-e', 'tell application "System Events" to keystroke "$" using {command down, shift down}'])
						break
					case 'win32':
						this.windowsCapture(true, false)
						break
				}
			}
		}))

		menu.append(new MenuItem({
			label: 'Upload full screen capture',
			click: () => {
				switch(this.platform) {
					case 'darwin':
						execFile('/usr/bin/osascript', ['-e', 'tell application "System Events" to keystroke "#" using {command down, shift down}'])
						break
					case 'win32':
						this.windowsCapture(false, false)
						break
				}
			}
		}))

		menu.append(new MenuItem({
			type: 'separator'
		}))

		menu.append(new MenuItem({
			label: 'Settings',
			click: () => this.showSettingsWindow()
		}))

		menu.append(new MenuItem({
			label: 'Exit '+this.name,
			click: () => app.quit()
		}))

		this.tray.setContextMenu(menu)
	}

	watch() {
		switch(this.platform) {
			case 'darwin':
				const desktopFolder = path.join(process.env['HOME'], 'Desktop')
				const checkedFiles = []

				const checker = () => {
					fs.readdir(desktopFolder, (err, files) => {
						if (err || !files.length) return setTimeout(() => checker(), 1000)

						checkedFiles
						.filter(file => files.indexOf(file) === -1)
						.forEach(file => checkedFiles.splice(checkedFiles.indexOf(file), 1))

						async.each(
							files.filter(file => checkedFiles.indexOf(file) === -1 && /.png$/.test(file)),
							(file, callback) => {
								const filePath = path.join(desktopFolder, file)

								if (Date.now() - fs.statSync(filePath).ctime.getTime() > 3000) {
									checkedFiles.push(file)
									return callback()
								}

								execFile('/usr/bin/mdls', ['--raw', '--name', 'kMDItemIsScreenCapture', filePath], (error, stdout) => {
									if (error || !parseInt(stdout)) return callback()

									console.log('Uploading %s', filePath)

									this.upload(this.moveToTemp(filePath), filePath)

									checkedFiles.push(file)
									callback()
								})
							},
							() => {
								setTimeout(() => checker(), 1000)
							}
						)
					})
				}
				checker()
				break
			case 'win32':
				globalShortcut.register("CmdOrCtrl+Shift+1", () => this.windowsCapture(true, true))
				globalShortcut.register("CmdOrCtrl+Shift+2", () => this.windowsCapture(true, false))
				globalShortcut.register("CmdOrCtrl+Shift+3", () => this.windowsCapture())
				break
		}
	}

	windowsCapture(crop=false, copy=false) {
		if (this.platform !== 'win32') return

		const date = new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '.')
		const imagePath = path.join(app.getPath('temp'), `Screen Shot at ${date}.png`)

		execFile(path.join(app.getAppPath(), 'bin', 'win', 'nircmd.exe'), ['savescreenshotfull', imagePath], (error, stdout) => {
			if (error) return

			if (!crop) {
				this.upload(this.moveToTemp(imagePath), imagePath)
				return
			}

			const allScreens = electron.screen.getAllDisplays()
			allScreens.forEach(s => {
				s.bounds.maxX = s.bounds.x + s.bounds.width
				s.bounds.maxY = s.bounds.y + s.bounds.height
			})

			const minX = allScreens.reduce((pv, cv) => pv < cv.bounds.x ? pv : cv.bounds.x, 0)
			const minY = allScreens.reduce((pv, cv) => pv < cv.bounds.y ? pv : cv.bounds.y, 0)
			const maxWidth = allScreens.reduce((pv, cv) => pv <= cv.bounds.maxX ? cv.bounds.maxX : pv, 0) + Math.abs(minX)
			const maxHeight = allScreens.reduce((pv, cv) => pv <= cv.bounds.maxY ? cv.bounds.maxY : pv, 0) + Math.abs(minY)

			this.cropWindow = new BrowserWindow({
				show: false,
				frame: false,
				alwaysOnTop: true,
				skipTaskbar: true,
				autoHideMenuBar: true,
				resizable:false,
				enableLargerThanScreen: true,
				thickFrame: false
			})

			this.cropWindow.setSize(maxWidth, maxHeight)
			this.cropWindow.setPosition(minX, minY)

			this.cropWindow.loadURL(`file://${path.join(app.getAppPath(), `crop-window.html?image_path=${encodeURIComponent(imagePath)}`)}`)

			this.cropWindow.on('close', () => {
				this.cropWindow = null

				if (copy) {
					const clipboardImage = NativeImage.createFromPath(imagePath)
					clipboard.writeImage(clipboardImage)
					if (this.settings.get('audioNotifications')) {
						this.workerWindow.webContents.send('audio-notify', 'fire')
					}
					this.notify('Cropped image copied to your clipboard')
				} else {
					this.upload(this.moveToTemp(imagePath), imagePath)
				}

			})

		})
	}

	upload(file, oldFile) {
		const selectedService = "imgur"

		file = this.buildFileName(file)
		file = this.prefixFilename(file)

		this.setTrayState('active')

		this.resize(file, () => {
			this.services.get().upload(file, (err, url) => {
				if (err || !url) {
					this.setTrayState('off')
					dialog.showMessageBox({type: 'error', buttons: ['Ok'], message: 'An error has occured :(', detail: err.message})
					return
				}

				this.recent.unshift(url)
				this.recent = this.recent.slice(0, 14)

				this.settings.set("recent", this.recent)

				this.buildTrayMenu()

				this.copyToClipboard(url)

				if (oldFile) this.trash(oldFile)

				this.deleteFile(file)

				if (this.settings.get('audioNotifications')) {
					this.workerWindow.webContents.send('audio-notify', 'fire')
				}

				if (this.settings.get('openBrowser')) {
					this.openInBrowser(url)
				}

				if (this.settingsWindow) {
					this.settingsWindow.webContents.send('relist-uploads', {url: url})
				}

				this.setTrayState('complete')
				setTimeout(() => this.setTrayState('off'), 3000)
			})
		})
	}

	moveToTemp(file) {
		const tmpFile = path.join(app.getPath('temp'), Date.now() + path.basename(file))
		fs.writeFileSync(tmpFile, fs.readFileSync(file))
		return tmpFile
	}

	trash(file) {
		if (this.settings.get('sendToTrash') === false) return

		trash([file])
	}

	deleteFile(file) {
		fs.unlinkSync(file)
	}

	buildFileName(file) {
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
		let newName = ""
		for(let i = 0; i < this.settings.get('buildFileNamesLength'); i++) {
			newName += characters.charAt(Math.floor(Math.random() * characters.length))
		}
		newName += path.extname(file)

		const newFile = path.join(path.dirname(file), newName)
		fs.renameSync(file, newFile)
		return newFile
	}

	prefixFilename(file) {
		if (!this.settings.get('prefixFilenames')) return file

		const newName = this.settings.get('prefixFilenames') + path.basename(file)

		const newFile = path.join(path.dirname(file), newName)
		fs.renameSync(file, newFile)
		return newFile
	}

	resize(file, callback) {
		if (this.platform !== 'darwin' || this.settings.get('retinaResize') === false)
			return callback()

		execFile('/usr/bin/sips', ['-g', 'dpiWidth', '-g', 'pixelWidth', file], (error, stdout) => {
			if (error) return callback()

			const lines = stdout.split('\n')

			const dpiWidth = parseFloat(lines[1].split(':')[1].trim())
			const pixelWidth = parseInt(lines[2].split(':')[1].trim())

			if (parseInt(dpiWidth) === 72) return callback()

			const newWidth = Math.round((72 / dpiWidth) * pixelWidth)

			execFile('/usr/bin/sips', ['--resampleWidth', newWidth, file], (error, stdout) => {
				callback()
			})
		})
	}

	notify(body, url) {
		if (!this.settings.get('enableNotifications')) return

		this.workerWindow.webContents.send('system-notify', body, url)
	}

	openInBrowser(url) {
		shell.openExternal(url)
	}

	copyToClipboard(url) {
		clipboard.writeText(url)
		this.notify('The screenshot URL has been copied to your clipboard', url)
	}
}

app.on('ready', () => global.Kiteshare = new Kiteshare());
