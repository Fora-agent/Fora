/**
 * Markets tracked by Fora on Robinhood Chain.
 * Each entry: [symbol, name, token address, main Uniswap pool, inversed]
 * "inversed" tells DexPaprika which side of the pool is the stock token.
 * Every address can be checked on https://robinhoodchain.blockscout.com
 */
// [symbol, name, token address, main pool address, inversed]
export const MARKETS = [
  ["AAPL", "Apple", "0xaf3d76f1834a1d425780943c99ea8a608f8a93f9", "0xeab0adac76db99a233ed077ca6be7a3f708baee6f98b17df69f7e1a07d1dc2e4", 1],
  ["AMC", "AMC Entertainment", "0x05a3d1cd21d0c88145e82600e62e7e496e0f222b", "0x27ccf0a6d1ee74840220715bcca7d3b01e0d33aa30d0259b47ae1585b3f4c071", 0],
  ["AMZN", "Amazon", "0x12f190a9f9d7d37a250758b26824b97ce941bf54", "0x68beff3b4270ffbbb78a48d7670648909b9de6736456b0f450fee242e1d10a8b", 1],
  ["BABA", "Alibaba", "0xad25ac6c84d497db898fa1e8387bf6af3532a1c4", "0xa57ab582b310dd6f9e934ea1eeea152741545e6a", 0],
  ["CRCL", "Circle Internet Group", "0xdf0992e440dd0be65bd8439b609d6d4366bf1cb5", "0x654e4143e82a5824445ade0824351c2a9acd95a8", 0],
  ["GLD", "SPDR Gold Trust", "0xc9a981fee1f9dec688bb123ccdecc63d0debfc4e", "0x7a6a053eccf1446a2633e05aa6d40d09381997ec", 0],
  ["GME", "GameStop", "0x1b0e319c6a659f002271b69db8a7df2f911c153e", "0xe9713f453adb9245b19559790c96f470a18f2fdf", 0],
  ["GOOGL", "Alphabet Class A", "0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3", "0x6d0f67069596c7ef9d1ce6981c1b6dbcd9a91b0c5393aebe9dd07c35e412df30", 1],
  ["META", "Meta Platforms", "0xc0d6457c16cc70d6790dd43521c899c87ce02f35", "0x5875d407a42965b0e768c8925cea290e06fa50603ef34fc99eb92a1050e6ae36", 0],
  ["MSTR", "Strategy Inc.", "0xec262a75e413fafd0df80480274532c79d42da09", "0x319bac87e616a89e241c10aeb8afd4892a852cdd8b373cd9765ecddc40b87cfe", 0],
  ["MU", "Micron Technology", "0xff080c8ce2e5feadaca0da81314ae59d232d4afd", "0xd057b1bc54917855bbee58ead58647f47cab35e5", 0],
  ["NVDA", "NVIDIA", "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec", "0xd4eb21209c4d6093f80b5b84f5c45cc093ea14a3", 0],
  ["PLTR", "Palantir Technologies", "0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a", "0xee430ee1003e1985e1828a01b9a20dad67ad4302994fe2abb4a173de4ac54623", 0],
  ["QQQ", "Invesco QQQ", "0xd5f3879160bc7c32ebb4dc785f8a4f505888de68", "0x8493982435e4273028008cd181c84c0d6a548f96792fdb5acddcbb6a8c82d305", 1],
  ["RDDT", "Reddit", "0x05b37fb53a299a1b874a619e1c4c404d52c36f4c", "0xa8744e76aed23b05f0126335e7bd38f7935d19fe", 0],
  ["SPCX", "SpaceX", "0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea", "0xc61284332117c3fb23a2a56cceffd07f7af60029", 0],
  ["SPY", "SPDR S&P 500 ETF Trust", "0x117cc2133c37b721f49de2a7a74833232b3b4c0c", "0xfe2a80bb5618fd14984b92ca6d45bf5ba67443ddb1435e28b2e48df2fc1526cd", 0],
  ["TSLA", "Tesla", "0x322f0929c4625ed5bad873c95208d54e1c003b2d", "0xf4acdaeeb7022862a763c9b1b885e11191c889e3", 0],
  ["TSM", "Taiwan Semiconductor", "0x58ffe4a942d3885baa22d7520691f611ef09e7aa", "0x4c862e5846659b086fe73896bbb9058513417e4e6938a1be93aeb7a768fa5754", 1],
  ["USO", "United States Oil Fund", "0xa30fa36db767ad9ed3f7a60fc79526fb4d56d344", "0x02175608f1b5e6b5ed221ccfdc7be197d111d915", 0],
  ["WETH", "Ethereum (WETH)", "0x0bd7d308f8e1639fab988df18a8011f41eacad73", "0x52e65b17fb6e5ba00ed806f37afcd2daa50271ca", 0],
];
