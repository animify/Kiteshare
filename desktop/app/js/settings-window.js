'use strict'

const app = angular.module('settingsWindow', [])

const electron = require('electron')
const remote = electron.remote
const ipcRenderer = electron.ipcRenderer
const shell = electron.shell

const debounce = require('lodash.debounce')

const inputMenu = require('electron-input-menu')
const contextMenu = require('electron-contextmenu-middleware')
contextMenu.use(inputMenu)
contextMenu.activate()
inputMenu.registerShortcuts()

app.run($rootScope => {
	$rootScope.Platform = require('os').platform()
	$rootScope.Electron = remote.app
	$rootScope.AppName = $rootScope.Electron.getName()
	$rootScope.Version = $rootScope.Electron.getVersion()
	$rootScope.Window = remote.getCurrentWindow()
	$rootScope.Kiteshare = remote.getGlobal('Kiteshare')

	$rootScope.Window.focus()
})

app.controller('settings', ($scope, $rootScope) => {
		const Kiteshare = $rootScope.Kiteshare

		$scope.services = Kiteshare.services.list().map(s => {
			return {
				name: s.name,
				_name: s._name,
				description: s.description,
				settings: s.settings
			}
		})

		$scope.recent = Kiteshare.recent
		$scope.settings = Kiteshare.settings.get()
		$scope.selectedService = Kiteshare.services.get($scope.settings.selectedService) || Kiteshare.services.list()[0]
		// $scope.serviceSettings = $scope.selectedService.getSettings()
		$scope.autoLaunchSetting = false

		Kiteshare.settings.getAutoLaunch(state => {
			$scope.autoLaunchSetting = state
			$scope.$apply()

			$scope.$watch('autoLaunchSetting', () => Kiteshare.settings.setAutoLaunch($scope.autoLaunchSetting))
		})

		$scope.resetAll = () => Kiteshare.settings.resetAll()

		$scope.$watch('selectedService', service => {
			$scope.settings.selectedService = service._name
			// $scope.serviceSettings = $scope.selectedService.settings

			$scope.save()
		})

		$scope.$watch('settings', () => $scope.save(), true)
		$scope.$watch('serviceSettings', () => $scope.save(), true)

		$('.on').bind("click", function() {
			const checkBox = $(this).parent().next("input[type='checkbox']")
			if (checkBox.prop("checked")) return
			checkBox.click()
		})

		$('.off').bind("click", function() {
			const checkBox = $(this).parent().next("input[type='checkbox']")
			if (!checkBox.prop("checked")) return
			checkBox.click()
		})

		$scope.save = debounce(() => {
			Kiteshare.services.get($scope.selectedService._name).saveSettings()
			Kiteshare.settings.save()
		}, 1000, {
			leading: true,
			trailing: true
		})

		ipcRenderer.on('relist-uploads', (event, arg) => {
			$scope.recent.push(arg.url)
			$scope.$apply()
		})

})

$(() => {
	$('[data-toggle="tab"]').bind("click", function() {
		$('.pane').removeClass("active")
		$($(this).attr("href")).addClass("active")
	})

	$(document).on('click', 'a[href^="http"]', function(event) {
			event.preventDefault()
			shell.openExternal(this.href)
	})

	$('.ac-min').bind('click', () => {
		const window = remote.getCurrentWindow()
		window.minimize()
	})

	$('.ac-max').bind('click', function(e) {
		const window = remote.getCurrentWindow()
		if (!window.isMaximized()) {
			window.maximize()
			$(this).find('i').text("crop_16_9")
		} else {
			window.unmaximize()
			$(this).find('i').text("check_box_outline_blank")
		}
	})

	$('.ac-close').bind('click', () => {
		const window = remote.getCurrentWindow()
		window.close()
	})
})
