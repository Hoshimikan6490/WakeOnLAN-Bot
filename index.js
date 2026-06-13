const {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	REST,
	Routes,
	MessageFlags,
} = require('discord.js');
const child_process = require('child_process');
require('dotenv').config({ quiet: true });

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

//////////////////////////////////////////////////////////////
// load config
const token = process.env.token;
const ownerID = process.env.ownerID;
const usageGuildID = process.env.usageGuildID;
const ipAddress = process.env.ipAddress;
const macAddress = process.env.macAddress;

//////////////////////////////////////////////////////////////
// Command definition
client.commands = [];
const wake = new SlashCommandBuilder()
	.setName('wake')
	.setDescription('PCを起動します。');
const ping = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Pingを測定します。');
const uptime = new SlashCommandBuilder()
	.setName('uptime')
	.setDescription('Botの稼働時間を表示します。');
client.commands.push(wake);
client.commands.push(ping);
client.commands.push(uptime);

//////////////////////////////////////////////////////////////
// Online status
client.on('clientReady', () => {
	const rest = new REST({ version: '10' }).setToken(token);
	async () => {
		try {
			await rest.put(Routes.applicationGuildCommands(usageGuildID), {
				body: await client.commands,
			});
			console.log('スラッシュコマンドの再読み込みに成功しました。');
		} catch (err) {
			console.log(
				`❌ スラッシュコマンドの再読み込み時にエラーが発生しました：\n${err}`,
			);
		}
	};

	console.log(`Logged in as ${client.user.tag} on ${Date()}!`);
});

//////////////////////////////////////////////////////////////
// Command handling
Client.on('interactionCreate', async (interaction) => {
	try {
		if (
			!interaction.inGuild() &&
			interaction.author.id === ownerID &&
			interaction.guilds.id === usageGuildID
		) {
			await interaction.reply({
				content:
					'このBOTは、特定のサーバーの特定のユーザーのみが利用できます。不明な点やご質問などは、[サポートサーバー](https://discord.gg/uYYaVRuUuJ)からお問い合わせください。',
				flags: MessageFlags.Ephemeral,
			});
			return;
		} else {
			if (interaction.isApplicationCommand()) {
				const { commandName } = interaction;

				switch (commandName) {
					case 'wake': {
						// wake command
						child_process.exec(
							`wakeonlan -i ${ipAddress} ${macAddress}`,
							(err, stdout) => {
								if (err) {
									interaction.reply({
										content: '❌ PCの起動中にエラーが発生しました。',
										flags: MessageFlags.Ephemeral,
									});
								} else {
									interaction.reply({
										content: '✅ PCの起動コマンドを送信しました。',
										flags: MessageFlags.Ephemeral,
									});
								}
							},
						);
						break;
					}
					case 'ping': {
						// ping command
						const latency = Date.now() - interaction.createdTimestamp;
						interaction.reply({
							content: `🏓 Latency is \`${latency}ms\`. \nAPI Latency is \`${Math.round(
								client.ws.ping,
							)}ms\`.`,
							flags: MessageFlags.Ephemeral,
						});
					}
					case 'uptime': {
						const hours = Math.round(client.uptime / 1000 / 3600);
						interaction.reply({
							content: `Uptime is \`${hours}\` hours.`,
							flags: MessageFlags.Ephemeral,
						});
					}
					case 'status': {
						child_process.exec(
							`ping ${ipAddress} -c 1`,
							async (err, stdout) => {
								if (err) {
									await interaction.reply({
										content: 'PC is offline.',
										flags: MessageFlags.Ephemeral,
									});
									return;
								} else {
									const response = stdout.trim();
									if (response) {
										await interaction.reply({
											content: response,
											flags: MessageFlags.Ephemeral,
										});
									} else {
										await interaction.reply({
											content: 'No response. PC is offline.',
											flags: MessageFlags.Ephemeral,
										});
									}
								}
							},
						);
					}
				}
			}
		}
	} catch (err) {
		console.error(`Error handling command: ${err}`);
	}
});

client.login(token);
