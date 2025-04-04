import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Debug "mo:base/Debug";

actor Token {
    private stable var name_ : Text = "DATE";
    private stable var symbol_ : Text = "DATE";
    private stable var decimals_ : Nat8 = 8;
    private stable var totalSupply_ : Nat = 1_000_000_000;
    private stable var owner_ : Principal = Principal.fromText("aaaaa-aa");

    private var balances = HashMap.HashMap<Principal, Nat>(1, Principal.equal, Principal.hash);
    private var allowances = HashMap.HashMap<Principal, HashMap.HashMap<Principal, Nat>>(1, Principal.equal, Principal.hash);

    // Token info
    public query func name() : async Text { name_ };
    public query func symbol() : async Text { symbol_ };
    public query func decimals() : async Nat8 { decimals_ };
    public query func totalSupply() : async Nat { totalSupply_ };

    // Balance operations
    public query func balanceOf(who: Principal) : async Nat {
        Option.get(balances.get(who), 0)
    };

    public shared(msg) func transfer(to: Principal, value: Nat) : async Bool {
        let from = msg.caller;
        let fromBalance = Option.get(balances.get(from), 0);
        if (fromBalance < value) return false;

        let toBalance = Option.get(balances.get(to), 0);
        balances.put(from, fromBalance - value);
        balances.put(to, toBalance + value);

        true
    };

    // Allowance operations
    public query func allowance(owner: Principal, spender: Principal) : async Nat {
        switch (allowances.get(owner)) {
            case (?ownerAllowances) {
                Option.get(ownerAllowances.get(spender), 0)
            };
            case (_) { 0 };
        }
    };

    public shared(msg) func approve(spender: Principal, value: Nat) : async Bool {
        let owner = msg.caller;
        switch (allowances.get(owner)) {
            case (?ownerAllowances) {
                ownerAllowances.put(spender, value);
            };
            case (_) {
                let newAllowances = HashMap.HashMap<Principal, Nat>(1, Principal.equal, Principal.hash);
                newAllowances.put(spender, value);
                allowances.put(owner, newAllowances);
            };
        };
        true
    };

    // Date2Earn mechanics
    public shared(msg) func earnTokens(amount: Nat) : async Bool {
        assert(amount <= 100); // Maximum tokens per action
        let to = msg.caller;
        let toBalance = Option.get(balances.get(to), 0);
        balances.put(to, toBalance + amount);
        true
    };

    // System functions
    system func preupgrade() {
        // Add upgrade logic here
    };

    system func postupgrade() {
        // Add post-upgrade logic here
    };
} 