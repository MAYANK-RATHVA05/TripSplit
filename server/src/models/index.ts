import mongoose, { Schema, Document, Types } from 'mongoose';

// --- USER ---
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  preferredCurrency: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    preferredCurrency: { type: String, default: 'USD', uppercase: true },
    avatar: { type: String }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

// --- GROUP ---
export interface IGroup extends Document {
  name: string;
  description?: string;
  baseCurrency: string;
  startDate?: string;
  endDate?: string;
  creatorId: Types.ObjectId;
  status: 'active' | 'closed' | 'archived';
  budgetMinor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    baseCurrency: { type: String, required: true, default: 'USD', uppercase: true },
    startDate: { type: String },
    endDate: { type: String },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'closed', 'archived'], default: 'active' },
    budgetMinor: { type: String }
  },
  { timestamps: true }
);

export const Group = mongoose.model<IGroup>('Group', GroupSchema);

// --- MEMBERSHIP ---
export interface IMembership extends Document {
  groupId: Types.ObjectId;
  memberId: string; // stable UUID
  userId?: Types.ObjectId;
  guestDisplayName: string;
  role: 'owner' | 'member';
  state: 'active' | 'invited' | 'left';
  color: string;
  joinedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    memberId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestDisplayName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    state: { type: String, enum: ['active', 'invited', 'left'], default: 'active' },
    color: { type: String, default: '#4F46E5' },
    joinedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Prevent duplicate active membership for the same user in the same group (only when userId exists)
MembershipSchema.index(
  { groupId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);

// --- INVITATION ---
export interface IInvitation extends Document {
  groupId: Types.ObjectId;
  memberId: string;
  tokenHash: string;
  expiresAt: Date;
  creatorUserId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'revoked';
}

const InvitationSchema = new Schema<IInvitation>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    memberId: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    creatorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' }
  },
  { timestamps: true }
);

export const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);

// --- EXPENSE ---
export interface IPayerSubdoc {
  memberId: string;
  amountMinor: string; // original currency
  baseAmountMinor: string; // group base currency
}

export interface IParticipantSubdoc {
  memberId: string;
  amountMinor: string; // original currency
  baseAmountMinor: string; // group base currency
  percentage?: number;
  shares?: number;
}

export interface IAttachmentSubdoc {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface IExpense extends Document {
  groupId: Types.ObjectId;
  description: string;
  merchant?: string;
  date: string; // YYYY-MM-DD
  category: string;
  notes?: string;
  originalAmountMinor: string;
  originalCurrency: string;
  exchangeRate: string;
  rateDirection: string;
  baseAmountMinor: string;
  baseCurrency: string;
  splitMethod: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';
  splitExplanation?: string;
  payers: IPayerSubdoc[];
  participants: IParticipantSubdoc[];
  attachments: IAttachmentSubdoc[];
  creatorMemberId: string;
  version: number;
  isVoided: boolean;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    description: { type: String, required: true, trim: true },
    merchant: { type: String, trim: true },
    date: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      default: 'Food & Drink',
      enum: [
        'Food & Drink',
        'Transportation',
        'Accommodation',
        'Sightseeing',
        'Activities',
        'Groceries',
        'Shopping',
        'Entertainment',
        'Utilities',
        'Other'
      ]
    },
    notes: { type: String, default: '' },
    originalAmountMinor: { type: String, required: true },
    originalCurrency: { type: String, required: true, uppercase: true },
    exchangeRate: { type: String, required: true, default: '1.0' },
    rateDirection: { type: String, required: true },
    baseAmountMinor: { type: String, required: true },
    baseCurrency: { type: String, required: true, uppercase: true },
    splitMethod: {
      type: String,
      enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'],
      default: 'EQUAL'
    },
    splitExplanation: { type: String },
    payers: [
      {
        memberId: { type: String, required: true },
        amountMinor: { type: String, required: true },
        baseAmountMinor: { type: String, required: true }
      }
    ],
    participants: [
      {
        memberId: { type: String, required: true },
        amountMinor: { type: String, required: true },
        baseAmountMinor: { type: String, required: true },
        percentage: { type: Number },
        shares: { type: Number }
      }
    ],
    attachments: [
      {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true }
      }
    ],
    creatorMemberId: { type: String, required: true },
    version: { type: Number, default: 1 },
    isVoided: { type: booleanSchemaType(), default: false, index: true },
    idempotencyKey: { type: String, index: true, sparse: true }
  },
  { timestamps: true }
);

function booleanSchemaType() {
  return Boolean;
}

ExpenseSchema.index({ groupId: 1, date: -1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);

// --- SETTLEMENT ---
export interface ISettlement extends Document {
  groupId: Types.ObjectId;
  senderMemberId: string;
  recipientMemberId: string;
  originalAmountMinor: string;
  originalCurrency: string;
  exchangeRate: string;
  rateDirection?: string;
  baseAmountMinor: string;
  baseCurrency: string;
  date: string;
  notes?: string;
  proofUrl?: string;
  creatorMemberId: string;
  version: number;
  isReversed: boolean;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    senderMemberId: { type: String, required: true },
    recipientMemberId: { type: String, required: true },
    originalAmountMinor: { type: String, required: true },
    originalCurrency: { type: String, required: true, uppercase: true },
    exchangeRate: { type: String, default: '1.0' },
    rateDirection: { type: String },
    baseAmountMinor: { type: String, required: true },
    baseCurrency: { type: String, required: true, uppercase: true },
    date: { type: String, required: true },
    notes: { type: String, default: '' },
    proofUrl: { type: String },
    creatorMemberId: { type: String, required: true },
    version: { type: Number, default: 1 },
    isReversed: { type: Boolean, default: false, index: true },
    idempotencyKey: { type: String, index: true, sparse: true }
  },
  { timestamps: true }
);

SettlementSchema.index({ groupId: 1, date: -1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);

// --- ACTIVITY ---
export interface IActivity extends Document {
  groupId: Types.ObjectId;
  actorMemberId: string;
  actorName: string;
  action:
    | 'CREATE_EXPENSE'
    | 'UPDATE_EXPENSE'
    | 'VOID_EXPENSE'
    | 'RECORD_SETTLEMENT'
    | 'REVERSE_SETTLEMENT'
    | 'ADD_MEMBER'
    | 'CLAIM_MEMBERSHIP'
    | 'CREATE_GROUP'
    | 'UPDATE_GROUP';
  entityType: 'expense' | 'settlement' | 'member' | 'group';
  entityId: string;
  details: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    actorMemberId: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ groupId: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
