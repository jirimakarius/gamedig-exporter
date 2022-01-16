'use strict';

const express = require('express');
const server = express();
const client = require('prom-client');
const register = client.register;
const Gamedig = require('gamedig');

const up = new client.Gauge({
	name: 'gamedig_up',
	help: 'Gameserver running',
});
const maxplayers = new client.Gauge({
	name: 'gamedig_max_players',
	help: 'Max players',
	labelNames: ['server_name', 'map', 'game'],
});
const players = new client.Gauge({
	name: 'gamedig_players',
	help: 'Number of players',
	labelNames: ['server_name', 'map', 'game'],
});
const ping = new client.Gauge({
	name: 'gamedig_ping',
	help: 'Ping',
	labelNames: ['server_name', 'map', 'game'],
});

async function collectGamedigData() {
	const game_type = process.env.GAME_TYPE || 'protocol-valve';
	const host = process.env.GAME_HOST || 'localhost';
	const port = process.env.GAME_PORT || null;

	try {
		const data = await Gamedig.query({ type: game_type, host, port });

		const labels = Object.assign(
			{ server_name: data.name, map: data.map },
			collectGamedigRawData(game_type, data),
		);
		up.set(1);
		maxplayers.set(labels, data.maxplayers);
		players.set(labels, data.players.length);
		ping.set(labels, data.ping);
	} catch (ex) {
		up.set(0);
	}
}

function collectGamedigRawData(game_type, data) {
	switch (game_type) {
		case 'protocol-valve':
			return { game: data.raw.game };
	}
}

server.get('/metrics', async (req, res) => {
	try {
		await collectGamedigData();
		res.set('Content-Type', register.contentType);
		res.end(await register.metrics());
	} catch (ex) {
		res.status(500).end(ex);
	}
});

const port = process.env.PORT || 3000;
console.log(
	`Server listening to ${port}, metrics exposed on /metrics endpoint`,
);
server.listen(port);
