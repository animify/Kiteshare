const fs = require('fs')
const path = require('path')

const request = require('request')

const ServiceSettings = require('../service-settings')

const ImgurClientID = '5ca1bc7ce402b47'

class Service extends ServiceSettings {
	constructor(kiteshareSettings) {
		super(kiteshareSettings, 'imgur')

		this.settings = []
	}

	upload(filePath, callback) {
		fs.readFile(filePath, (err, data) => {
			if (err) return callback(err)

			request.post({
				url: 'https://api.imgur.com/3/upload',
				headers: {
					'Authorization': `Client-ID ${ImgurClientID}`
				},
				form: {
					type: 'base64',
					image: new Buffer(data).toString('base64')
				},
				json: true
			}, (err, res, body) => {
				if (err || !res || res.statusCode !== 200 || !body) {
					return callback(new Error(`Error: ${err ? err.message : `${res && res.statusCode} server response code`}`))
				}

				callback(null, body.data.link.replace(/^http:/,'https:'))
			})
		})
	}
}

module.exports = Service
