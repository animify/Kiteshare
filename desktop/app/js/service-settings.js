class ServiceSettings {
	constructor(kiteshareSettings, name) {
		this._kiteshareSettings = kiteshareSettings
		this._name = name
	}

	saveSettings() {
		this.settings.forEach(option => {
			this.setSetting(option.key, option.value)
		})
	}

	getSettings() {
		return this.settings
	}

	getSetting(key) {
		return this._kiteshareSettings.get(`${this._name}_${key}`)
	}

	setSetting(key, value) {

		return this._kiteshareSettings.set(`${this._name}_${key}`, value)
	}

	loadSettings() {
		this.settings.forEach(option => {
			option.value = this.getSetting(option.key) || option.default
		})
	}
}

module.exports = ServiceSettings
