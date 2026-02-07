client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content !== "!bonushesapla") return;

  // 🔒 Yetki kontrolü
  const yetkiliMi = message.member.roles.cache.some(
    role => role.name === YETKILI_ROL
  );

  if (!yetkiliMi) {
    return message.reply("❌ Bu komutu kullanamazsın.");
  }

  const kanal = message.channel;

  // 📥 Son 50 mesajı çek
  const mesajlar = await kanal.messages.fetch({ limit: 50 });

  // 🤖 En son bot hesaplama mesajını bul
  const sonHesaplama = mesajlar.find(m =>
    m.author.id === client.user.id &&
    m.content.includes("BizzWar Bonus")
  );

  let hedefMesaj = null;

  for (const mesaj of mesajlar.values()) {
    // Eğer önceki hesaplama varsa, ondan öncekileri alma
    if (sonHesaplama && mesaj.createdTimestamp <= sonHesaplama.createdTimestamp) {
      continue;
    }

    // Bot mesajlarını geç
    if (mesaj.author.bot) continue;

    // Format kontrolü
    const satirlar = mesaj.content.split("\n");
    const uygunMu = satirlar.some(s => /^.+\s+\d+$/.test(s));

    if (uygunMu) {
      hedefMesaj = mesaj;
      break;
    }
  }

  if (!hedefMesaj) {
    return message.reply("❌ Son hesaplamadan sonra uygun formatta mesaj bulunamadı.");
  }

  const satirlar = hedefMesaj.content.split("\n");
  let sonucMesaji = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";
  let bulundu = false;

  for (const satir of satirlar) {
    const eslesme = satir.match(/^(.+?)\s+(\d+)$/);
    if (!eslesme) continue;

    bulundu = true;

    const isim = eslesme[1].trim();
    const kill = parseInt(eslesme[2]);
    const para = kill * 150000;

    const uye = message.guild.members.cache.find(
      m => m.displayName.toLowerCase() === isim.toLowerCase()
    );

    const etiket = uye ? `<@${uye.id}>` : isim;

    sonucMesaji += `🔫 ${etiket} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
  }

  if (!bulundu) {
    return message.reply("❌ Kill verisi okunamadı.");
  }

  kanal.send(sonucMesaji);
});
