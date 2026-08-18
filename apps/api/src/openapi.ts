type JsonSchema = Record<string, unknown>

const errorSchema: JsonSchema = {
  type: 'object',
  properties: {
    data: { nullable: true, example: null },
    error: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
        code: { type: 'string' },
      },
    },
  },
}

const userSchema: JsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    displayName: { type: 'string' },
    avatarUrl: { type: 'string' },
    connectedPlatforms: {
      type: 'array',
      items: { type: 'string', enum: ['spotify', 'apple_music', 'youtube_music', 'soundcloud'] },
    },
    createdAt: { type: 'string', format: 'date-time' },
    role: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
  },
}

function envelope(data: JsonSchema): JsonSchema {
  return {
    type: 'object',
    properties: {
      data,
      error: { nullable: true, example: null },
    },
  }
}

function jsonContent(schema: JsonSchema): JsonSchema {
  return { content: { 'application/json': { schema } } }
}

function jsonBody(schema: JsonSchema): JsonSchema {
  return { required: true, ...jsonContent(schema) }
}

const errorResponses: JsonSchema = {
  '400': { description: 'Bad request', ...jsonContent(errorSchema) },
  '401': { description: 'Missing or invalid bearer token', ...jsonContent(errorSchema) },
  '403': { description: 'Forbidden', ...jsonContent(errorSchema) },
  '404': { description: 'Not found', ...jsonContent(errorSchema) },
  '500': { description: 'Server error', ...jsonContent(errorSchema) },
}

const bearer = [{ bearerAuth: [] }]
const publicRoute: [] = []

const providerParam: JsonSchema = {
  name: 'provider',
  in: 'path',
  required: true,
  schema: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
}

const idParam = (name: string, description: string): JsonSchema => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
})

const success = { type: 'object', properties: { success: { type: 'boolean', example: true } } }
const playlistLinkBody: JsonSchema = {
  type: 'object',
  required: ['provider', 'playlistId', 'playlistName'],
  properties: {
    provider: { type: 'string', enum: ['spotify', 'apple_music', 'soundcloud'] },
    playlistId: { type: 'string' },
    playlistName: { type: 'string' },
    imageUrl: { type: 'string' },
    externalUrl: { type: 'string' },
  },
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShareList API',
    version: '1.0.0',
    description:
      'Metadata and sharing API for cross-platform playlists. Authenticate with `POST /auth/login`, then click Authorize and paste `data.session.access_token` as a Bearer token.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Admin' },
    { name: 'Streaming' },
    { name: 'ShareLists' },
    { name: 'Friends' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token from `POST /auth/login` (`data.session.access_token`).',
      },
    },
    schemas: {
      ApiError: errorSchema,
      User: userSchema,
    },
  },
  security: bearer,
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: publicRoute,
        responses: {
          '200': { description: 'API is up', ...jsonContent(envelope({ type: 'object', properties: { status: { type: 'string', example: 'ok' } } })) },
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Health'],
        summary: 'OpenAPI specification',
        security: publicRoute,
        responses: { '200': { description: 'OpenAPI 3 document' } },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register',
        security: publicRoute,
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
        }),
        responses: {
          '201': { description: 'User created', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        security: publicRoute,
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
        }),
        responses: {
          '200': { description: 'Session created. Use `data.session.access_token` as the Bearer token.', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out',
        responses: {
          '200': { description: 'Session revoked', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/auth/password-reset/request': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        security: publicRoute,
        requestBody: jsonBody({
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            redirectTo: { type: 'string', description: 'Frontend URL after the reset link is clicked' },
          },
        }),
        responses: {
          '200': { description: 'Email sent when the account exists', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/auth/password-reset/confirm': {
      post: {
        tags: ['Auth'],
        summary: 'Confirm password reset',
        security: publicRoute,
        requestBody: jsonBody({
          type: 'object',
          required: ['access_token', 'password'],
          properties: {
            access_token: { type: 'string' },
            password: { type: 'string' },
          },
        }),
        responses: {
          '200': { description: 'Password updated', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        responses: {
          '200': { description: 'Authenticated user profile', ...jsonContent(envelope(userSchema)) },
          ...errorResponses,
        },
      },
    },

    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user profile',
        description: 'Own profile, or any profile if the caller is an admin.',
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': { description: 'User', ...jsonContent(envelope(userSchema)) },
          ...errorResponses,
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update own profile',
        parameters: [idParam('id', 'User id (must match the authenticated user)')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            display_name: { type: 'string' },
            avatar_url: { type: 'string' },
          },
        }),
        responses: {
          '200': { description: 'Updated user', ...jsonContent(envelope(userSchema)) },
          ...errorResponses,
        },
      },
    },

    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        description: 'Requires `usermanage:listusers`.',
        responses: {
          '200': { description: 'Users', ...jsonContent(envelope({ type: 'array', items: { type: 'object' } })) },
          ...errorResponses,
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create user',
        description: 'Requires `usermanage:add`.',
        requestBody: jsonBody({
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
        }),
        responses: {
          '201': { description: 'Created', ...jsonContent(envelope({ type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' } } })) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update user profile',
        parameters: [idParam('id', 'User id')],
        requestBody: jsonBody({
          type: 'object',
          properties: { display_name: { type: 'string' }, avatar_url: { type: 'string' } },
        }),
        responses: {
          '200': { description: 'Updated', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete user',
        description: 'Requires `usermanage:deleteusers`.',
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': { description: 'Deleted', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/password': {
      post: {
        tags: ['Admin'],
        summary: 'Set user password',
        parameters: [idParam('id', 'User id')],
        requestBody: jsonBody({
          type: 'object',
          required: ['password'],
          properties: { password: { type: 'string', minLength: 6 } },
        }),
        responses: {
          '200': { description: 'Password updated', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/verify': {
      post: {
        tags: ['Admin'],
        summary: 'Mark email verified',
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': { description: 'Verified', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/unverify': {
      post: {
        tags: ['Admin'],
        summary: 'Clear email verification',
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': { description: 'Unverified', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/email': {
      patch: {
        tags: ['Admin'],
        summary: 'Change unverified email',
        parameters: [idParam('id', 'User id')],
        requestBody: jsonBody({
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        }),
        responses: {
          '200': { description: 'Email updated and verification sent', ...jsonContent(envelope({ type: 'object', properties: { email: { type: 'string' } } })) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/resend-verification': {
      post: {
        tags: ['Admin'],
        summary: 'Resend verification email',
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': { description: 'Sent', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/magic-link': {
      post: {
        tags: ['Admin'],
        summary: 'Send magic login link',
        parameters: [idParam('id', 'User id')],
        requestBody: jsonBody({
          type: 'object',
          properties: { redirectTo: { type: 'string' } },
        }),
        responses: {
          '200': { description: 'Sent', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/suspend': {
      patch: {
        tags: ['Admin'],
        summary: 'Suspend user',
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': { description: 'Suspended', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/unsuspend': {
      patch: {
        tags: ['Admin'],
        summary: 'Unsuspend user',
        parameters: [idParam('id', 'User id')],
        responses: {
          '200': { description: 'Unsuspended', ...jsonContent(envelope(success)) },
          ...errorResponses,
        },
      },
    },
    '/admin/users/{id}/permissions': {
      put: {
        tags: ['Admin'],
        summary: 'Replace user permissions',
        parameters: [idParam('id', 'User id')],
        requestBody: jsonBody({
          type: 'object',
          required: ['permissions'],
          properties: { permissions: { type: 'array', items: { type: 'string' } } },
        }),
        responses: {
          '200': { description: 'Updated', ...jsonContent(envelope({ type: 'object', properties: { permissions: { type: 'array', items: { type: 'string' } } } })) },
          ...errorResponses,
        },
      },
    },

    '/streaming/providers': {
      get: {
        tags: ['Streaming'],
        summary: 'List registered providers',
        responses: {
          '200': { description: 'Providers', ...jsonContent(envelope({ type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, displayName: { type: 'string' } } } })) },
          ...errorResponses,
        },
      },
    },
    '/streaming/connected': {
      get: {
        tags: ['Streaming'],
        summary: 'List connected services',
        responses: {
          '200': { description: 'Connected providers', ...jsonContent(envelope({ type: 'array', items: { type: 'object' } })) },
          ...errorResponses,
        },
      },
    },
    '/streaming/{provider}/auth-url': {
      get: {
        tags: ['Streaming'],
        summary: 'Get provider auth URL',
        parameters: [
          providerParam,
          { name: 'returnOrigin', in: 'query', schema: { type: 'string' }, description: 'Frontend origin to return to after OAuth' },
        ],
        responses: {
          '200': { description: 'Auth URL', ...jsonContent(envelope({ type: 'object', properties: { url: { type: 'string' }, redirectUri: { type: 'string' } } })) },
          ...errorResponses,
        },
      },
    },
    '/streaming/{provider}/callback': {
      get: {
        tags: ['Streaming'],
        summary: 'OAuth redirect callback',
        description: 'Used by redirect-based providers (Spotify, SoundCloud). Redirects back to the frontend.',
        security: publicRoute,
        parameters: [
          providerParam,
          { name: 'code', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'error', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '302': { description: 'Redirect to the frontend settings page' } },
      },
      post: {
        tags: ['Streaming'],
        summary: 'In-page auth callback',
        description: 'Used by Apple Music. Body `code` is the MusicKit user token.',
        parameters: [providerParam],
        requestBody: jsonBody({
          type: 'object',
          required: ['code', 'state'],
          properties: { code: { type: 'string' }, state: { type: 'string' } },
        }),
        responses: {
          '200': { description: 'Connected', ...jsonContent(envelope({ type: 'object', properties: { providerUserId: { type: 'string' } } })) },
          ...errorResponses,
        },
      },
    },
    '/streaming/{provider}/playlists': {
      get: {
        tags: ['Streaming'],
        summary: 'List playlists for a provider',
        parameters: [providerParam],
        responses: {
          '200': { description: 'Playlists', ...jsonContent(envelope({ type: 'array', items: { type: 'object' } })) },
          ...errorResponses,
        },
      },
    },
    '/streaming/{provider}': {
      delete: {
        tags: ['Streaming'],
        summary: 'Disconnect provider',
        parameters: [providerParam],
        responses: {
          '200': { description: 'Disconnected', ...jsonContent(envelope({ type: 'object', properties: { disconnected: { type: 'boolean' } } })) },
          ...errorResponses,
        },
      },
    },

    '/sharelists': {
      get: {
        tags: ['ShareLists'],
        summary: 'List ShareLists',
        responses: {
          '200': { description: 'ShareLists the user owns or can access', ...jsonContent(envelope({ type: 'array', items: { type: 'object' } })) },
          ...errorResponses,
        },
      },
      post: {
        tags: ['ShareLists'],
        summary: 'Create a ShareList from a playlist',
        requestBody: jsonBody({
          ...playlistLinkBody,
          properties: {
            ...(playlistLinkBody['properties'] as object),
            name: { type: 'string', description: 'ShareList name; defaults to playlistName' },
          },
        }),
        responses: {
          '201': { description: 'Created', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/sharelists/{id}': {
      get: {
        tags: ['ShareLists'],
        summary: 'ShareList detail and tracks',
        parameters: [idParam('id', 'ShareList id')],
        responses: {
          '200': { description: 'ShareList with linked playlists and tracks', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
      patch: {
        tags: ['ShareLists'],
        summary: 'Rename a ShareList',
        parameters: [idParam('id', 'ShareList id')],
        requestBody: jsonBody({
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        }),
        responses: {
          '200': { description: 'Renamed', ...jsonContent(envelope({ type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } })) },
          ...errorResponses,
        },
      },
      delete: {
        tags: ['ShareLists'],
        summary: 'Delete or leave a ShareList',
        description: 'Owner deletes the list (collaborator links are preserved as their own lists). Collaborator leaves.',
        parameters: [idParam('id', 'ShareList id')],
        responses: {
          '200': { description: 'Deleted or left', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/sharelists/{id}/sync': {
      post: {
        tags: ['ShareLists'],
        summary: 'Refresh linked playlist metadata and tracks',
        parameters: [idParam('id', 'ShareList id')],
        responses: {
          '200': { description: 'Updated ShareList detail', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/sharelists/{id}/links': {
      post: {
        tags: ['ShareLists'],
        summary: 'Link another playlist',
        parameters: [idParam('id', 'ShareList id')],
        requestBody: jsonBody(playlistLinkBody),
        responses: {
          '201': { description: 'Linked', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/sharelists/{id}/links/{linkId}': {
      delete: {
        tags: ['ShareLists'],
        summary: 'Unlink a playlist',
        parameters: [idParam('id', 'ShareList id'), idParam('linkId', 'Link id')],
        responses: {
          '200': { description: 'Unlinked', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/sharelists/{id}/cross-sync': {
      post: {
        tags: ['ShareLists'],
        summary: 'Push merged tracks to every linked playlist',
        parameters: [idParam('id', 'ShareList id')],
        responses: {
          '200': { description: 'Per-link add counts', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/sharelists/{id}/shuffle': {
      post: {
        tags: ['ShareLists'],
        summary: 'Apply a shuffled track order to linked playlists',
        parameters: [idParam('id', 'ShareList id')],
        requestBody: jsonBody({
          type: 'object',
          required: ['trackIds'],
          properties: { trackIds: { type: 'array', items: { type: 'string' } } },
        }),
        responses: {
          '200': { description: 'Shuffle result', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },

    '/friends': {
      get: {
        tags: ['Friends'],
        summary: 'Friends, pending invites, and incoming requests',
        responses: {
          '200': { description: 'Friends payload', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/share': {
      post: {
        tags: ['Friends'],
        summary: 'Share a ShareList with a user or email',
        requestBody: jsonBody({
          type: 'object',
          required: ['sharelistId'],
          properties: {
            sharelistId: { type: 'string' },
            userId: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        }),
        responses: {
          '200': { description: 'Shared with an existing user', ...jsonContent(envelope({ type: 'object' })) },
          '201': { description: 'Invite emailed', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/unshare': {
      post: {
        tags: ['Friends'],
        summary: 'Unshare a ShareList',
        requestBody: jsonBody({
          type: 'object',
          required: ['sharelistId'],
          properties: {
            sharelistId: { type: 'string' },
            userId: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        }),
        responses: {
          '200': { description: 'Unshared', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/remove': {
      post: {
        tags: ['Friends'],
        summary: 'Remove a friend or pending invites',
        requestBody: jsonBody({
          type: 'object',
          properties: {
            userId: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        }),
        responses: {
          '200': { description: 'Removed', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/invites': {
      post: {
        tags: ['Friends'],
        summary: 'Send an invite email',
        requestBody: jsonBody({
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            sharelistId: { type: 'string' },
          },
        }),
        responses: {
          '201': { description: 'Invite sent', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/invites/{inviteId}/resend': {
      post: {
        tags: ['Friends'],
        summary: 'Resend a pending invite',
        parameters: [idParam('inviteId', 'Invite id')],
        responses: {
          '200': { description: 'Resent', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/invites/{inviteId}': {
      delete: {
        tags: ['Friends'],
        summary: 'Delete a pending invite',
        parameters: [idParam('inviteId', 'Invite id')],
        responses: {
          '200': { description: 'Deleted', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/invites/{token}': {
      get: {
        tags: ['Friends'],
        summary: 'Public invite preview',
        security: publicRoute,
        parameters: [idParam('token', 'Invite token')],
        responses: {
          '200': { description: 'Invite preview', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/invites/{token}/accept': {
      post: {
        tags: ['Friends'],
        summary: 'Accept invite by email token',
        parameters: [idParam('token', 'Invite token')],
        responses: {
          '200': { description: 'Accepted', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/requests/{inviteId}/accept': {
      post: {
        tags: ['Friends'],
        summary: 'Accept an incoming request',
        parameters: [idParam('inviteId', 'Invite id')],
        responses: {
          '200': { description: 'Accepted', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
    '/friends/requests/{inviteId}/reject': {
      post: {
        tags: ['Friends'],
        summary: 'Reject an incoming request',
        parameters: [idParam('inviteId', 'Invite id')],
        responses: {
          '200': { description: 'Rejected', ...jsonContent(envelope({ type: 'object' })) },
          ...errorResponses,
        },
      },
    },
  },
}
