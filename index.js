client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (!message.content.toLowerCase().startsWith("!bonushesapla")) return;

    console.log("✅ !bonushesapla ALGILANDI");

    // 🔒 Yetki kontrolü
    const yetkiliMi = message.member.roles.cache.some(
      role => role.name === YETKILI_ROL
    );

    if (!yetkiliMi) {
      return message.reply("❌ Bu komutu kullanamazsın.");
    }

    const kanal = message.channel;

    // 📥 Son 100 mesaj
    const mesajlar = await kanal.messages.fetch({ limit: 100 });
    const mesajListesi = [...mesajlar.values()].reverse(); // eski → yeni

    // 🤖 En son bot hesaplama mesajı
    const sonHesaplama = mesajListesi
      .filter(m => m.author.id === client.user.id)
      .find(m => m.content.includes("BizzWar Bonus"));

    let hedefMesaj = null;

    for (const mesaj of mesajListesi) {
      if (
        sonHesaplama &&
        mesaj.createdTimestamp <= sonHesaplama.createdTimestamp
      ) {
        continue;
      }

      if (mesaj.author.bot) continue;

      const satirlar = mesaj.content.split("\n");
      const uygunMu = satirlar.some(s => /^.+\s+\d+$/.test(s.trim()));

      if (uygunMu) {
        hedefMesaj = mesaj;
      }
    }

    if (!hedefMesaj) {
      return message.reply("❌ Son hesaplamadan sonra uygun formatta mesaj bulunamadı.");
    }

    const satirlar = hedefMesaj.content.split("\n");
    let sonucMesaji = "🏆 **BizzWar Bonus Sonuçları** 🏆\n\n";
    let bulundu = false;

    for (const satir of satirlar) {
      const eslesme = satir.trim().match(/^(.+?)\s+(\d+)$/);
      if (!eslesme) continue;

      bulundu = true;

      const isim = eslesme[1].trim();
      const kill = parseInt(eslesme[2], 10);
      const para = kill * 150000;

      // 👤 Üye bulma (güçlü yöntem)
      let uye =
        message.guild.members.cache.find(
          m => m.displayName.toLowerCase() === isim.toLowerCase()
        );

      if (!uye) {
        try {
          const members = await message.guild.members.fetch();
          uye = members.find(
            m => m.displayName.toLowerCase() === isim.toLowerCase()
          );
        } catch {}
      }

      const etiket = uye ? `<@${uye.id}>` : isim;

      sonucMesaji += `🔫 ${etiket} → **${kill} kill** | 💰 **${para.toLocaleString()}$**\n`;
    }

    if (!bulundu) {
      return message.reply("❌ Kill verisi okunamadı.");
    }

    await kanal.send(sonucMesaji);
    console.log("✅ Bonus mesajı gönderildi");

  } catch (err) {
    console.error("❌ Bonus hesaplama hatası:", err);
    message.reply("❌ Hesaplama sırasında hata oluştu.");
  }
});
