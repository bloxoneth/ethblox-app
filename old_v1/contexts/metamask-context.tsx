"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"

interface MetaMaskState {
  account: string | null
  chainId: string | null
  isConnected: boolean
  isInstalled: boolean
  isMobile: boolean
  isMetaMaskBrowser: boolean
}

interface MetaMaskContextType extends MetaMaskState {
  connect: () => Promise<void>
  disconnect: () => void
  switchAccount: () => Promise<void>
  switchChain: (chainId: string) => Promise<void>
}

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined)

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function getEthereum(): any {
  if (typeof window === "undefined") return null
  return (window as any).ethereum
}

function checkIsMetaMaskBrowser(): boolean {
  const ethereum = getEthereum()
  return Boolean(ethereum && ethereum.isMetaMask)
}

function getMetaMaskDeepLink(): string {
  if (typeof window === "undefined") return ""
  const currentUrl = window.location.href.replace(/^https?:\/\//, "")
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isIOS) {
    return `metamask://dapp/${currentUrl}`
  }
  return `https://metamask.app.link/dapp/${currentUrl}`
}

export function MetaMaskProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MetaMaskState>({
    account: null,
    chainId: null,
    isConnected: false,
    isInstalled: false,
    isMobile: false,
    isMetaMaskBrowser: false,
  })

  // Initialize mobile detection
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isMobile: isMobileDevice(),
      isMetaMaskBrowser: checkIsMetaMaskBrowser(),
    }))
  }, [])

  // Handle return from MetaMask app
  useEffect(() => {
    if (typeof window === "undefined") return

    const urlParams = new URLSearchParams(window.location.search)
    const fromMetaMask = urlParams.get("fromMetaMask") || urlParams.get("redirect")

    if (fromMetaMask) {
      window.history.replaceState({}, document.title, window.location.pathname)

      const ethereum = getEthereum()
      if (ethereum && ethereum.isMetaMask) {
        ethereum
          .request({ method: "eth_accounts" })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              ethereum.request({ method: "eth_chainId" }).then((chainId: string) => {
                localStorage.setItem("metamask_account", accounts[0])
                localStorage.setItem("metamask_chainId", chainId)
                setState((prev) => ({
                  ...prev,
                  account: accounts[0],
                  chainId,
                  isConnected: true,
                  isInstalled: true,
                }))
              })
            }
          })
          .catch(console.error)
      }
    }
  }, [])

  // Restore saved session
  useEffect(() => {
    const savedAccount = localStorage.getItem("metamask_account")
    const savedChainId = localStorage.getItem("metamask_chainId")

    if (savedAccount) {
      setState((prev) => ({
        ...prev,
        account: savedAccount,
        chainId: savedChainId,
        isConnected: true,
      }))
    }
  }, [])

  // Check MetaMask installation and setup listeners
  useEffect(() => {
    const ethereum = getEthereum()
    const isMetaMaskInstalled = Boolean(ethereum && ethereum.isMetaMask)

    setState((prev) => ({ ...prev, isInstalled: isMetaMaskInstalled }))

    if (!isMetaMaskInstalled) return

    // Auto-reconnect
    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts.length > 0) {
          ethereum.request({ method: "eth_chainId" }).then((chainId: string) => {
            localStorage.setItem("metamask_account", accounts[0])
            localStorage.setItem("metamask_chainId", chainId)
            setState((prev) => ({
              ...prev,
              account: accounts[0],
              chainId,
              isConnected: true,
              isInstalled: true,
              isMetaMaskBrowser: true,
            }))
          })
        }
      })
      .catch(console.error)

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        localStorage.removeItem("metamask_account")
        localStorage.removeItem("metamask_chainId")
        setState((prev) => ({
          ...prev,
          account: null,
          chainId: null,
          isConnected: false,
        }))
      } else {
        localStorage.setItem("metamask_account", accounts[0])
        setState((prev) => ({
          ...prev,
          account: accounts[0],
          isConnected: true,
        }))
      }
    }

    const handleChainChanged = (chainId: string) => {
      localStorage.setItem("metamask_chainId", chainId)
      setState((prev) => ({ ...prev, chainId }))
      if (!isMobileDevice()) {
        window.location.reload()
      }
    }

    ethereum.on("accountsChanged", handleAccountsChanged)
    ethereum.on("chainChanged", handleChainChanged)

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged)
      ethereum.removeListener("chainChanged", handleChainChanged)
    }
  }, [])

  const connect = async () => {
    const ethereum = getEthereum()
    const mobile = isMobileDevice()

    // If MetaMask provider exists, connect directly
    if (ethereum && ethereum.isMetaMask) {
      try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" })
        const chainId = await ethereum.request({ method: "eth_chainId" })

        localStorage.setItem("metamask_account", accounts[0])
        localStorage.setItem("metamask_chainId", chainId)

        setState((prev) => ({
          ...prev,
          account: accounts[0],
          chainId,
          isConnected: true,
          isInstalled: true,
          isMetaMaskBrowser: true,
        }))
        return
      } catch (error: any) {
        if (error.code === 4001) return
        console.error("Failed to connect:", error)
      }
    }

    // Mobile without MetaMask browser - open deep link
    if (mobile) {
      localStorage.setItem("metamask_pending_connect", "true")
      window.location.href = getMetaMaskDeepLink()

      setTimeout(() => {
        const pendingConnect = localStorage.getItem("metamask_pending_connect")
        if (pendingConnect && document.visibilityState === "visible") {
          localStorage.removeItem("metamask_pending_connect")
          if (confirm("MetaMask app not found. Would you like to install it?")) {
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
            window.location.href = isIOS
              ? "https://apps.apple.com/app/metamask/id1438144202"
              : "https://play.google.com/store/apps/details?id=io.metamask"
          }
        }
      }, 2500)
      return
    }

    // Desktop without MetaMask
    alert("MetaMask is not installed. Please install MetaMask to continue.")
    window.open("https://metamask.io/download/", "_blank")
  }

  const disconnect = () => {
    localStorage.removeItem("metamask_account")
    localStorage.removeItem("metamask_chainId")
    localStorage.removeItem("metamask_pending_connect")

    setState((prev) => ({
      ...prev,
      account: null,
      chainId: null,
      isConnected: false,
    }))
  }

  const switchingAccountRef = useRef(false)

  const switchAccount = async () => {
    if (switchingAccountRef.current) {
      console.log("[v0] Switch account already in progress, ignoring duplicate request")
      return
    }

    const ethereum = getEthereum()
    if (!ethereum) return

    try {
      switchingAccountRef.current = true

      await ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      })

      const accounts = await ethereum.request({ method: "eth_requestAccounts" })
      const chainId = await ethereum.request({ method: "eth_chainId" })

      localStorage.setItem("metamask_account", accounts[0])
      localStorage.setItem("metamask_chainId", chainId)

      setState((prev) => ({
        ...prev,
        account: accounts[0],
        chainId,
        isConnected: true,
      }))
    } catch (error) {
      console.error("Failed to switch account:", error)
    } finally {
      switchingAccountRef.current = false
    }
  }

  const switchChain = async (chainId: string) => {
    const ethereum = getEthereum()
    if (!ethereum) {
      throw new Error("MetaMask is not installed")
    }

    try {
      console.log("[v0] Requesting chain switch to:", chainId)
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      })
      console.log("[v0] Chain switched successfully")
    } catch (error: any) {
      console.error("[v0] Error switching chain:", error)

      // If chain doesn't exist, try to add it
      if (error.code === 4902) {
        throw new Error("Network not found in wallet. Please add Base Sepolia manually.")
      }
      throw error
    }
  }

  return (
    <MetaMaskContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        switchAccount,
        switchChain,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  )
}

export function useMetaMask() {
  const context = useContext(MetaMaskContext)
  if (context === undefined) {
    throw new Error("useMetaMask must be used within MetaMaskProvider")
  }
  return context
}
