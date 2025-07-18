// Import TonConnect SDK (via CDN or module bundler)
// Jika kamu tidak pakai bundler, bisa tambahkan ini di HTML kamu:
// <script src="https://unpkg.com/@tonconnect/sdk@latest"></script>

let tonConnect;
let connectedWallet;
const tonConnect = new TON_CONNECT.TonConnect({
  manifestUrl: 'https://andigraph.github.io/final/tonconnect-manifest.json'
});

async function initTonConnect() {
  tonConnect = new TON_CONNECT.TonConnect();
  await tonConnect.restoreConnection();

  if (tonConnect.connected) {
    connectedWallet = tonConnect.wallet;
    document.getElementById("status").textContent = "Wallet terhubung ✅";
    document.getElementById("user-name").textContent = connectedWallet.name || "Pengguna";
  } else {
    document.getElementById("status").textContent = "Wallet belum terhubung";
  }
}

async function connectWallet() {
  try {
    await tonConnect.connect();
    connectedWallet = tonConnect.wallet;
    document.getElementById("status").textContent = "Wallet terhubung ✅";
    document.getElementById("user-name").textContent = connectedWallet.name || "Pengguna";
    checkStatus();
  } catch (err) {
    document.getElementById("status").textContent = "Gagal menghubungkan wallet.";
    console.error(err);
  }
}

async function handleBayar() {
  if (!connectedWallet) {
    document.getElementById('status').textContent = "Silakan hubungkan wallet terlebih dahulu.";
    return;
  }

  const walletAddress = connectedWallet.account.address;
  const destinationAddress = "0QCzyrSNbHbash569LIGTG_UcgZoJWRtnpljEQbLW_qyA0Of";
  const amountNano = "500000000"; // 0.5 TON

  document.getElementById('status').textContent = "Mengirim transaksi...";

  // Simpan status pending ke Google Sheets
  fetch("https://script.google.com/macros/s/AKfycbx-sOgpMhPreDOCH6uqaHT5PB15f-AYhMgR7p4fNB9iClu2V9e7Leu7-jqJvyZl1yDT-g/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: walletAddress,
      amount: "0.5 TON",
      status: "Pending"
    })
  });

  // Kirim transaksi ke Ton blockchain
  try {
    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 300, // 5 menit ke depan
      messages: [{
        address: destinationAddress,
        amount: amountNano,
      }]
    };

    await tonConnect.sendTransaction(tx);
    document.getElementById('status').textContent = "Transaksi dikirim. Menunggu verifikasi...";

    // Tambahkan jeda untuk konfirmasi jaringan sebelum verifikasi
    setTimeout(() => verifyPayment(walletAddress), 15000);

  } catch (err) {
    document.getElementById('status').textContent = "Transaksi gagal.";
    console.error(err);
  }
}

async function verifyPayment(walletAddress = null) {
  if (!walletAddress && connectedWallet) {
    walletAddress = connectedWallet.account.address;
  }

  try {
    const res = await fetch("https://toncenter.com/api/v2/getTransactions?address=0QCzyrSNbHbash569LIGTG_UcgZoJWRtnpljEQbLW_qyA0Of&limit=10&to_lt=0&archival=false");
    const json = await res.json();

    const tx = json.result.find(tx =>
      tx.in_msg?.source === walletAddress &&
      parseInt(tx.in_msg.value) >= 490000000
    );

    if (tx) {
      document.getElementById('status').textContent = "Pembayaran ditemukan ✅";

      await fetch("https://script.google.com/macros/s/AKfycbx-sOgpMhPreDOCH6uqaHT5PB15f-AYhMgR7p4fNB9iClu2V9e7Leu7-jqJvyZl1yDT-g/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          amount: "0.5 TON",
          status: "Success"
        })
      });
    } else {
      document.getElementById('status').textContent = "Belum ada pembayaran yang terdeteksi.";
    }
  } catch (err) {
    document.getElementById('status').textContent = "Gagal verifikasi pembayaran.";
    console.error(err);
  }
}

function checkStatus() {
  const walletAddress = connectedWallet?.account?.address;
  if (!walletAddress) return;

  fetch("https://script.google.com/macros/s/AKfycbx-sOgpMhPreDOCH6uqaHT5PB15f-AYhMgR7p4fNB9iClu2V9e7Leu7-jqJvyZl1yDT-g/exec?wallet=" + walletAddress)
    .then(res => res.json())
    .then(data => {
      const status = data.status || "Belum ada pembayaran";
      document.getElementById('status').textContent = "Status pembayaran: " + status;
    })
    .catch(err => {
      document.getElementById('status').textContent = "Gagal memuat status.";
      console.error(err);
    });
}

window.onload = () => {
  initTonConnect();
};
