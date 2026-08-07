import {
	Client,
	GatewayIntentBits,
	PresenceUpdateStatus,
	ActivityType,
	SlashCommandBuilder,
	REST,
	Routes,
	MessageFlags,
} from 'discord.js';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
const execAsync = promisify(exec);
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

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

	setInterval(async () => {
		// pingの結果を取得して、Botのステータスを更新する
		const pingCmd =
			process.platform === 'win32'
				? `ping -n 1 ${ipAddress}`
				: `ping -c 1 ${ipAddress}`;
		try {
			const { stdout, stderr } = await execAsync(pingCmd);
			if (!stderr && stdout) {
				const response = stdout.trim();
				if (response) {
					client.user.setStatus(PresenceUpdateStatus.Online);
					client.user.setActivity(`pingに成功しました。`, {
						type: ActivityType.Playing,
					});
				}
			} else {
				// pingに失敗した場合は、Botのステータスを「オフライン」に設定する
				client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
				client.user.setActivity(
					`Pingに応答がありません。PCがオフラインになっているか、IPアドレスの設定が誤っています。`,
					{
						type: ActivityType.Watching,
					},
				);
			}
		} catch (err) {
			// pingに失敗した場合は、Botのステータスを「オフライン」に設定する
			client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
			client.user.setActivity(
				`Pingに応答がありません。PCがオフラインになっているか、IPアドレスの設定が誤っています。`,
				{
					type: ActivityType.Watching,
				},
			);
		}
	}, 30000);
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
					try {
						const { stdout, stderr } = await execAsync(
							`wakeonlan -i ${ipAddress} ${macAddress}`,
						);
						if (stderr) {
							await interaction.editReply({
								content: '❌ UnicastでのPCの起動中にエラーが発生しました。',
							});
						}

						const broadcastIPaddress =
							ipAddress.split('.').slice(0, 3).join('.') + '.255';
						const { stdout: broadcastStdout, stderr: broadcastStderr } =
							await execAsync(
								`wakeonlan -i ${broadcastIPaddress} ${macAddress}`,
							);
						if (broadcastStderr) {
							await interaction.editReply({
								content: '❌ BroadcastでのPCの起動中にエラーが発生しました。',
							});
						}

						await interaction.editReply({
							content: '✅ PCの起動コマンドを送信しました。',
						});
					} catch (err) {
						await interaction.editReply({
							content: '❌ PCの起動中に何らかのエラーが発生しました。',
						});
					}
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
					try {
						const { stdout, stderr } = await execAsync(pingCmd);
						if (!stderr && stdout) {
							const response = stdout.trim();
							if (response) {
								await interaction.editReply({
									content: response,
								});
							}
						} else {
							await interaction.editReply({
								content:
									'PCがオフラインになっているか、IPアドレスの設定が誤っています。',
							});
						}
					} catch (err) {
						await interaction.editReply({
							content:
								'Pingに応答がありません。PCがオフラインになっているか、IPアドレスの設定が誤っています。',
						});
					}
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
		console.error(`Error handling command:\n`);
		console.error(err);
	}
});

client.login(token);
