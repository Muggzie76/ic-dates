import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Hash "mo:base/Hash";
import Nat "mo:base/Nat";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import Text "mo:base/Text";
import Error "mo:base/Error";

actor Token {
    // Token metadata
    private let name_ : Text = "IC Dinner Token";
    private let symbol_ : Text = "DINNER";
    private let decimals_ : Nat8 = 8;
    private let totalSupply_ : Nat = 1_000_000_000;

    // Staking configuration
    private let MIN_STAKE_AMOUNT : Nat = 100;
    private let MAX_STAKE_AMOUNT : Nat = 10_000;
    private let STAKE_DURATION_OPTIONS : [Int] = [
        30 * 24 * 60 * 60 * 1000000000, // 30 days
        90 * 24 * 60 * 60 * 1000000000, // 90 days
        180 * 24 * 60 * 60 * 1000000000 // 180 days
    ];
    private let APR_RATES : [Nat] = [5, 10, 15]; // 5%, 10%, 15% APR for each duration

    // Reward configuration
    private let MATCH_REWARD : Nat = 10;
    private let MESSAGE_REWARD : Nat = 1;
    private let PROFILE_UPDATE_REWARD : Nat = 5;
    private let DAILY_CAP : Nat = 100;

    private stable var rewardEntries : [(Principal, RewardState)] = [];
    private stable var stakeEntries : [(Principal, [StakeInfo])] = [];

    // Types
    type RewardState = {
        lastRewardTime: Int;
        dailyRewards: Nat;
        totalRewards: Nat;
    };

    type RewardType = {
        #Match;
        #Message;
        #ProfileUpdate;
    };

    type StakeInfo = {
        amount: Nat;
        startTime: Int;
        duration: Int;
        claimed: Bool;
    };

    // Balances
    private var balances = HashMap.HashMap<Principal, Nat>(1, Principal.equal, Principal.hash);

    // Allowances
    private var allowances = HashMap.HashMap<Principal, HashMap.HashMap<Principal, Nat>>(1, Principal.equal, Principal.hash);

    // Reward tracking
    private var rewards = HashMap.HashMap<Principal, RewardState>(1, Principal.equal, Principal.hash);

    // Staking
    private var stakes = HashMap.HashMap<Principal, Buffer.Buffer<StakeInfo>>(1, Principal.equal, Principal.hash);

    // System functions
    system func preupgrade() {
        let rewardBuffer = Buffer.Buffer<(Principal, RewardState)>(0);
        for ((p, s) in rewards.entries()) {
            rewardBuffer.add((p, s));
        };
        rewardEntries := Array.map<(Principal, RewardState), (Principal, RewardState)>(
            Buffer.toArray(rewardBuffer),
            func((p, s)) = (p, s)
        );

        let stakeBuffer = Buffer.Buffer<(Principal, Buffer.Buffer<StakeInfo>)>(0);
        for ((p, b) in stakes.entries()) {
            stakeBuffer.add((p, b));
        };
        stakeEntries := Array.map<(Principal, Buffer.Buffer<StakeInfo>), (Principal, [StakeInfo])>(
            Buffer.toArray(stakeBuffer),
            func((p, b)) : (Principal, [StakeInfo]) = (p, Buffer.toArray(b))
        );
    };

    system func postupgrade() {
        for ((principal, state) in rewardEntries.vals()) {
            rewards.put(principal, state);
        };
        rewardEntries := [];
        for ((principal, stakeArray) in stakeEntries.vals()) {
            let stakeBuffer = Buffer.Buffer<StakeInfo>(stakeArray.size());
            for (stake in stakeArray.vals()) {
                stakeBuffer.add(stake);
            };
            stakes.put(principal, stakeBuffer);
        };
        stakeEntries := [];
    };

    // Helper functions
    private func _transfer(from: Principal, to: Principal, value: Nat) : Result.Result<(), Text> {
        switch (balances.get(from)) {
            case (?fromBalance) {
                if (fromBalance >= value) {
                    let newFromBalance = fromBalance - value;
                    balances.put(from, newFromBalance);
                    
                    switch (balances.get(to)) {
                        case (?toBalance) {
                            balances.put(to, toBalance + value);
                        };
                        case null {
                            balances.put(to, value);
                        };
                    };
                    #ok(())
                } else {
                    #err("Insufficient balance")
                }
            };
            case null {
                #err("From account does not exist")
            };
        }
    };

    private func _getRewardAmount(rewardType: RewardType) : Nat {
        switch(rewardType) {
            case (#Match) MATCH_REWARD;
            case (#Message) MESSAGE_REWARD;
            case (#ProfileUpdate) PROFILE_UPDATE_REWARD;
        }
    };

    private func _canReceiveReward(user: Principal) : Bool {
        let currentTime = Time.now();
        let startOfDay = currentTime - (currentTime % (24 * 60 * 60 * 1000000000));
        
        switch(rewards.get(user)) {
            case (?state) {
                let isNewDay = state.lastRewardTime < startOfDay;
                let underDailyCap = state.dailyRewards < DAILY_CAP;
                isNewDay or underDailyCap
            };
            case null true
        }
    };

    private func _calculateReward(stake: StakeInfo) : Nat {
        let currentTime = Time.now();
        if (currentTime < stake.startTime + stake.duration) {
            return 0; // Stake duration not completed
        };

        let durationIndex = switch(stake.duration) {
            case (d) {
                if (d == STAKE_DURATION_OPTIONS[0]) 0
                else if (d == STAKE_DURATION_OPTIONS[1]) 1
                else if (d == STAKE_DURATION_OPTIONS[2]) 2
                else 0
            };
        };

        let apr = APR_RATES[durationIndex];
        let rewardAmount = (stake.amount * apr) / 100;
        rewardAmount
    };

    // Public functions
    public shared(msg) func distributeReward(user: Principal, rewardType: RewardType) : async Result.Result<Nat, Text> {
        // Only allow specific canisters to distribute rewards
        let allowedCanisters = [
            Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"), // MATCHING_CANISTER_ID
            Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"), // MESSAGING_CANISTER_ID
            Principal.fromText("r7inp-6aaaa-aaaaa-aaabq-cai")  // PROFILE_CANISTER_ID
        ];
        
        var isAllowed = false;
        label l for (canister in allowedCanisters.vals()) {
            if (Principal.equal(canister, msg.caller)) {
                isAllowed := true;
                break l;
            };
        };

        if (not isAllowed) {
            return #err("Unauthorized: Only specific canisters can distribute rewards");
        };

        if (not _canReceiveReward(user)) {
            return #err("Daily reward cap reached");
        };

        let rewardAmount = _getRewardAmount(rewardType);
        
        // Update reward state
        let currentState = switch(rewards.get(user)) {
            case (?state) state;
            case null {
                {
                    lastRewardTime = Time.now();
                    dailyRewards = 0;
                    totalRewards = 0;
                }
            };
        };

        let newState = {
            lastRewardTime = Time.now();
            dailyRewards = currentState.dailyRewards + rewardAmount;
            totalRewards = currentState.totalRewards + rewardAmount;
        };
        
        rewards.put(user, newState);

        // Transfer tokens from contract to user
        switch(_transfer(Principal.fromActor(Token), user, rewardAmount)) {
            case (#ok()) #ok(rewardAmount);
            case (#err(e)) #err(e);
        }
    };

    public query func getRewardState(user: Principal) : async ?RewardState {
        rewards.get(user)
    };

    // Staking functions
    public shared(msg) func stake(amount: Nat, durationIndex: Nat) : async Result.Result<(), Text> {
        if (amount < MIN_STAKE_AMOUNT or amount > MAX_STAKE_AMOUNT) {
            return #err("Invalid stake amount. Must be between " # Nat.toText(MIN_STAKE_AMOUNT) # " and " # Nat.toText(MAX_STAKE_AMOUNT));
        };

        if (durationIndex >= STAKE_DURATION_OPTIONS.size()) {
            return #err("Invalid duration index");
        };

        let caller = msg.caller;
        switch (balances.get(caller)) {
            case (?balance) {
                if (balance < amount) {
                    return #err("Insufficient balance");
                };

                // Create new stake
                let newStake = {
                    amount = amount;
                    startTime = Time.now();
                    duration = STAKE_DURATION_OPTIONS[durationIndex];
                    claimed = false;
                };

                // Add stake to user's stakes
                switch (stakes.get(caller)) {
                    case (?userStakes) {
                        userStakes.add(newStake);
                    };
                    case null {
                        let newStakes = Buffer.Buffer<StakeInfo>(1);
                        newStakes.add(newStake);
                        stakes.put(caller, newStakes);
                    };
                };

                // Lock tokens
                balances.put(caller, balance - amount);
                #ok(())
            };
            case null #err("No balance found");
        }
    };

    public shared(msg) func unstake(stakeIndex: Nat) : async Result.Result<Nat, Text> {
        let caller = msg.caller;
        switch (stakes.get(caller)) {
            case (?userStakes) {
                if (stakeIndex >= userStakes.size()) {
                    return #err("Invalid stake index");
                };

                let stake = userStakes.get(stakeIndex);
                if (stake.claimed) {
                    return #err("Stake already claimed");
                };

                let currentTime = Time.now();
                if (currentTime < stake.startTime + stake.duration) {
                    return #err("Stake duration not completed");
                };

                let reward = _calculateReward(stake);
                let totalAmount = stake.amount + reward;

                // Update stake as claimed
                let updatedStake = {
                    amount = stake.amount;
                    startTime = stake.startTime;
                    duration = stake.duration;
                    claimed = true;
                };
                userStakes.put(stakeIndex, updatedStake);

                // Return staked amount plus reward
                switch (balances.get(caller)) {
                    case (?balance) {
                        balances.put(caller, balance + totalAmount);
                        #ok(totalAmount)
                    };
                    case null {
                        balances.put(caller, totalAmount);
                        #ok(totalAmount)
                    };
                }
            };
            case null #err("No stakes found");
        }
    };

    public query func getStakes(user: Principal) : async [StakeInfo] {
        switch (stakes.get(user)) {
            case (?userStakes) Buffer.toArray(userStakes);
            case null [];
        }
    };

    public query func getStakingConfig() : async {
        minStake: Nat;
        maxStake: Nat;
        durations: [Int];
        aprRates: [Nat];
    } {
        {
            minStake = MIN_STAKE_AMOUNT;
            maxStake = MAX_STAKE_AMOUNT;
            durations = STAKE_DURATION_OPTIONS;
            aprRates = APR_RATES;
        }
    };

    // Existing token functions...
    public query func name() : async Text { name_ };
    public query func symbol() : async Text { symbol_ };
    public query func decimals() : async Nat8 { decimals_ };
    public query func totalSupply() : async Nat { totalSupply_ };

    public query func balanceOf(who: Principal) : async Nat {
        switch (balances.get(who)) {
            case (?balance) balance;
            case null 0;
        }
    };

    public shared(msg) func transfer(to: Principal, value: Nat) : async Result.Result<(), Text> {
        _transfer(msg.caller, to, value)
    };

    public shared(msg) func approve(spender: Principal, value: Nat) : async Result.Result<(), Text> {
        switch (allowances.get(msg.caller)) {
            case (?ownerAllowances) {
                ownerAllowances.put(spender, value);
            };
            case null {
                let newAllowances = HashMap.HashMap<Principal, Nat>(1, Principal.equal, Principal.hash);
                newAllowances.put(spender, value);
                allowances.put(msg.caller, newAllowances);
            };
        };
        #ok(())
    };

    public query func allowance(owner: Principal, spender: Principal) : async Nat {
        switch (allowances.get(owner)) {
            case (?ownerAllowances) {
                switch (ownerAllowances.get(spender)) {
                    case (?allowance) allowance;
                    case null 0;
                }
            };
            case null 0;
        }
    };

    public shared(msg) func transferFrom(from: Principal, to: Principal, value: Nat) : async Result.Result<(), Text> {
        switch (allowances.get(from)) {
            case (?ownerAllowances) {
                switch (ownerAllowances.get(msg.caller)) {
                    case (?allowance) {
                        if (allowance >= value) {
                            let result = _transfer(from, to, value);
                            switch(result) {
                                case (#ok()) {
                                    ownerAllowances.put(msg.caller, allowance - value);
                                    #ok(())
                                };
                                case (#err(e)) #err(e);
                            }
                        } else {
                            #err("Insufficient allowance")
                        }
                    };
                    case null #err("No allowance for spender");
                }
            };
            case null #err("Owner has no allowances");
        }
    };

    // Date2Earn mechanics
    public shared(msg) func earnTokens(amount: Nat) : async Bool {
        assert(amount <= 100); // Maximum tokens per action
        let to = msg.caller;
        let toBalance = Option.get(balances.get(to), 0);
        balances.put(to, toBalance + amount);
        true
    };
} 