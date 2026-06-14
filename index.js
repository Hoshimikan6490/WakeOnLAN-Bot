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
const status = new SlashCommandBuilder()
	.setName('status')
	.setDescription('PCのオンライン状態を確認します。');
client.commands.push(wake);
client.commands.push(ping);
client.commands.push(uptime);
client.commands.push(status);

//////////////////////////////////////////////////////////////
// Online status
client.on('clientReady', async () => {
	const rest = new REST({ version: '10' }).setToken(token);
	try {
		await rest.put(
			Routes.applicationGuildCommands(client.user.id, usageGuildID),
			{ body: await client.commands },
		);
		console.log('スラッシュコマンドの再読み込みに成功しました。');
	} catch (err) {
		console.log(
			`❌ スラッシュコマンドの再読み込み時にエラーが発生しました：\n${err}`,
		);
	}

	console.log(`Logged in as ${client.user.tag} on ${Date()}!`);
});

//////////////////////////////////////////////////////////////
// Command handling
client.on('interactionCreate', async (interaction) => {
	try {
		if (
			!interaction.inGuild() ||
			interaction.user.id !== ownerID ||
			interaction.guild.id !== usageGuildID
		) {
			await interaction.reply({
				content:
					'このBOTは、特定のサーバーの特定のユーザーのみが利用できます。不明な点やご質問などは、[サポートサーバー](https://discord.gg/uYYaVRuUuJ)からお問い合わせください。',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (interaction.isCommand()) {
			const { commandName } = interaction;

			switch (commandName) {
				case 'wake': {
					await interaction.deferReply({
						flags: MessageFlags.Ephemeral,
					});
					child_process.exec(
						`wakeonlan ${macAddress}`,
						async (err) => {
							if (err) {
								await interaction.editReply({
									content: '❌ PCの起動中にエラーが発生しました。',
								});
							} else {
								await interaction.editReply({
									content: '✅ PCの起動コマンドを送信しました。',
								});
							}
						},
					);
					break;
				}
				case 'ping': {
					const latency = Date.now() - interaction.createdTimestamp;
					const APILatency =
						Math.round(client.ws.ping) === -1
							? 'N/A'
							: Math.round(client.ws.ping);
					await interaction.reply({
						content: `🏓 Latency is \`${latency}ms\`. \nAPI Latency is \`${APILatency}ms\`.`,
						flags: MessageFlags.Ephemeral,
					});
					break;
				}
				case 'uptime': {
					const days = Math.round(client.uptime / 1000 / 3600 / 24);
					const hours = Math.round(client.uptime / 1000 / 3600);
					const minutes = Math.round(client.uptime / 1000 / 60);
					await interaction.reply({
						content: `起動から \`${days}\` 日 \`${hours % 24}\` 時間 \`${minutes % 60}\` 分経過しています。`,
						flags: MessageFlags.Ephemeral,
					});
					break;
				}
				case 'status': {
					await interaction.deferReply({
						flags: MessageFlags.Ephemeral,
					});
					const pingCmd =
						process.platform === 'win32'
							? `ping -n 1 ${ipAddress}`
							: `ping -c 1 ${ipAddress}`;
					child_process.exec(pingCmd, async (err, stdout) => {
						if (err) {
							await interaction.editReply({
								content:
									'PCがオフラインになっているか、IPアドレスの設定が誤っています。',
							});
							return;
						} else {
							const response = stdout.trim();
							if (response) {
								await interaction.editReply({
									content: response,
								});
							} else {
								await interaction.editReply({
									content:
										'Pingに応答がありません。PCがオフラインになっているか、IPアドレスの設定が誤っています。',
								});
							}
						}
					});
					break;
				}
				default:
					await interaction.reply({
						content: '不明なコマンドです。',
						flags: MessageFlags.Ephemeral,
					});
			}
		}
	} catch (err) {
		console.error(`Error handling command: ${err}`);
	}
});

client.login(token);
