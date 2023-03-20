// #SDPXJDSFJSDLFJDLJ

pragma solidity ^0.8.0;

import {PluginUUPSUpgradeable, IDAO} from "@aragon/osx/core/plugin/PluginUUPSUpgradeable.sol";
import {PermissionLib} from "@aragon/osx/core/permission/PermissionLib.sol";
import {PluginSetup, IPluginSetup} from "@aragon/osx/framework/plugin/setup/PluginSetup.sol";
import {Whitelisting} from "./Whitelisting.sol";

contract WhitelistingSetup is PluginSetup {
    address private immutable whitelistingImplementation;

    constructor() {
        whitelistingImplementation = address(new Whitelisting());
    }

    /// @inheritdoc IPluginSetup
    function prepareInstallation(
        address _dao,
        bytes memory _data
    )
        external
        returns (address plugin, PreparedSetupData memory preparedSetupData)
    {
        plugin = createERC1967Proxy(
            whitelistingImplementation,
            abi.encodeWithSelector(Whitelisting.initializeBuild0.selector, _dao)
        );
    }

    /// @inheritdoc IPluginSetup
    function prepareUninstallation(
        address _dao,
        SetupPayload calldata _payload
    )
        external
        view
        returns (PermissionLib.MultiTargetPermission[] memory permissions)
    {}

    function implementation() external view virtual override returns (address) {
        return whitelistingImplementation;
    }
}
