import { useEffect, useState } from 'react'
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './myepicproject.json'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { Program, Provider, web3 } from '@project-serum/anchor'
import kp from './keypair.json'

const { SystemProgram } = web3

const baseAccount = web3.Keypair.fromSecretKey(new Uint8Array(Object.values(kp._keypair.secretKey)))
const programID = new PublicKey(idl.metadata.address)
const network = clusterApiUrl('devnet')
const opts = {
  preflightCommitment: 'processed'
}

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const getProvider = () => {
  const connection = new Connection(network, opts.preflightCommitment)
  const provider = new Provider(connection, window.solana, opts.preflightCommitment)
  return provider
}

const connectWallet = async (setWalletAddress) => {
  const { solana } = window

  if (!solana) return

  const response = await solana.connect()
  console.log('Connected with Public Key:', response.publicKey.toString())

  setWalletAddress(response.publicKey.toString())
}

/*
 * We want to render this UI when the user hasn't connected
 * their wallet to our app yet.
 */
const NotConnectedContainer = ({ setWalletAddress }) => (
  <button
    className="cta-button connect-wallet-button"
    onClick={() => connectWallet(setWalletAddress)}>
    Connect to Wallet
  </button>
)

const createGifAccount = async (setGifList) => {
  try {
    const provider = getProvider()
    const program = new Program(idl, programID, provider)
    console.log('ping')
    await program.rpc.initialize({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount]
    })
    console.log('Created a new BaseAccount w/ address:', baseAccount.publicKey.toString())
    await getGifList(setGifList)
  } catch(error) {
    console.log('Error creating BaseAccount account:', error)
  }
}

const getGifList = async (setGifList) => {
  try {
    const provider = getProvider()
    const program = new Program(idl, programID, provider)
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey)

    console.log('Got the account', account)
    setGifList(account.gifList)
  } catch (err) {
    console.log('Error in getGifts: ', err)
    setGifList(null)
  }
}

const ConnectedContainer = () => {
  const [inputValue, setInputValue] = useState('')
  const [gifList, setGifList] = useState([])

  useEffect(() => {
    getGifList(setGifList)
  }, [])

  if (gifList === null) {
    return (
      <div className="connected-container">
        <button className="cta-button submit-gif-button" onClick={() => createGifAccount(setGifList)}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div>
    )
  }

  return (
    <div className="connected-container">
      <input
        type="text"
        value={inputValue}
        onChange={evt => { setInputValue(evt.target.value) }}
        placeholder="Enter gif link!"
      />

      <button
        onClick={async () => {
          if (inputValue.length <= 0) return alert('Empty input. Try again')

          try {
            const program = new Program(idl, programID, getProvider())
            await program.rpc.addGif(inputValue, {
              accounts: {
                baseAccount: baseAccount.publicKey
              }
            })

            console.log('GIF successfully sent to program', inputValue)

            setInputValue('')
            await getGifList(setGifList)
          } catch (err) {
            console.error('Error sending GIF:', err)
          }
        }}
        className="cta-button submit-gif-button">
        Submit
      </button>

      <div className="gif-grid">
        {gifList.map(gif => (
          <div className="gif-item" key={gif.gifLink}>
            <img src={gif.gifLink} alt={gif.gifLink} />
            <p style={{ color: 'white' }}>{gif.userAddress.toString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null)

  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window

      if (!solana || !solana.isPhantom) return alert('Solana object not found! Get a Phantom Wallet 👻')

      console.log('Phantom wallet found!')

      /*
       * The solana object gives us a function that will allow us to connect
       * directly with the user's wallet!
       */
      const response = await solana.connect({ onlyIfTrusted: true })
      console.log('Connected with Public Key:', response.publicKey.toString())

      setWalletAddress(response.publicKey.toString())
    } catch (error) {
      console.error(error)
    }
  }

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    window.addEventListener('load', async (_event) => {
      await checkIfWalletIsConnected()
    })
  }, [])

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {walletAddress
          ? <ConnectedContainer />
          : <NotConnectedContainer setWalletAddress={setWalletAddress} />
          }
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
