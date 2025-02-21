import { ChainInfo } from '../types';
import LocalChainInfo from './local.json';
import PolygonInfo from './polygon.json';
import PolygonZKEVMInfo from './polygonzkevm.json';
import EthereumInfo from './ethereum.json';
import GoerliInfo from './goerli.json';
import BscInfo from './bsc.json';
import ArbitrumInfo from './arbitrum.json';
import ZkSyncInfo from './zksyncera.json';
import LineaInfo from './linea.json';
import OptimismInfo from './optimism.json';
import ScrollInfo from './scroll.json';
import MantleInfo from './mantle.json';
import BaseInfo from './base.json';
import ConfluxInfo from './conflux.json';
import MapoInfo from './mapo.json';
import SepoliaInfo from './sepolia.json';
import KlaytnInfo from './klaytn.json';
import BlastSepolia from './blastSepolia.json';
import Blast from './blast.json';
import Manta from './manta.json';
import BeraBartio from './berabartio.json';
import { ContextCoreError } from '../error';

export function getChainInfo(nameOrId: string | number): ChainInfo {
	const allInfos = [
		LocalChainInfo,
		PolygonInfo,
		PolygonZKEVMInfo,
		EthereumInfo,
		GoerliInfo,
		BscInfo,
		ArbitrumInfo,
		ZkSyncInfo,
		LineaInfo,
		OptimismInfo,
		ScrollInfo,
		MantleInfo,
		BaseInfo,
		ConfluxInfo,
		MapoInfo,
		SepoliaInfo,
		KlaytnInfo,
		BlastSepolia,
		Blast,
		Manta,
		BeraBartio,
	];
	for (const info of allInfos) {
		if (typeof nameOrId === 'number' && info.chainId === nameOrId) {
			return info as unknown as ChainInfo;
		}
		if (
			typeof nameOrId === 'string' &&
			(info.chainAlias.map(alias => alias.toLowerCase()).includes(nameOrId.toLowerCase()) ||
				info.chainName.toLowerCase() === nameOrId.toLowerCase())
		) {
			return info as unknown as ChainInfo;
		}
	}
	throw new ContextCoreError(`unsupported network ${nameOrId}`);
}
