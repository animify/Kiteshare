const app = require('electron').app
const fs = require('fs')
const path = require('path')

const servicesPath = path.join(app.getAppPath(), 'js', 'services')
const uploader = require(path.join(servicesPath, "imgur.js"))

class Services {
	constructor(settings) {
		this.settings = settings
		this.services = {}

		this.load()
	}

	load() {
		this.uploader = new uploader(this.settings)
	}

	list() {
		return Object.keys(this.services).map(name => this.services[name])
	}

	get() {
		return this.uploader
	}

	set(name, data) {
		return this.uploader.save(data)
	}
}

module.exports = Services
