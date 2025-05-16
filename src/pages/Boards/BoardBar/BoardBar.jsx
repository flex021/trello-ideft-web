import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import DashboardIcon from '@mui/icons-material/Dashboard'
import VpnLockIcon from '@mui/icons-material/VpnLock'
import AddToDriveIcon from '@mui/icons-material/AddToDrive'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import BoltIcon from '@mui/icons-material/Bolt'
import { Tooltip } from '@mui/material'
import { capitalizeFirstLetter } from '~/utils/formatters'
import BoardUserGroup from './BoardUserGroup'
import InviteBoardUser from './InviteBoardUser'
import { useConfirm } from 'material-ui-confirm'
import { deleteBoardDetailsAPI } from '~/apis'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

function BoardBar({ board }) {

  const MENU_STYLES = {
    color: 'white',
    bgcolor: 'transparent',
    border: 'none',
    paddingX: '5px',
    borderRadius: '4px',
    '.MuiSvgIcon-root': {
      color: 'white'
    },
    '&:hover': {
      bgcolor: 'primary.50'
    }
  }

  const navigate = useNavigate()

  const confirmDeleteColumn = useConfirm()
  const handleDeleteBoard = () => {
    confirmDeleteColumn({
      title: 'Are you sure you want to delete this Board?',
      confirmationKeyword: 'deal',
      description: 'Please type "deal" to delete this board',
      confirmationText: 'Confirm',
      cancellationText: 'Cancel'
    }).then(() => {
      deleteBoardDetailsAPI(board._id).then(res => {
        toast.success(res?.deleteResult)
        navigate('/boards')
      })
    }).catch(() => {})
  }

  return (
    <Box sx={{
      width: '100%',
      height: (theme) => theme.trello.boardBarHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 2,
      paddingX: 2,
      overflowX: 'auto',
      bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#323E54' : '#115BA7')
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Tooltip title={board?.description}>
          <Chip sx={MENU_STYLES}
            icon={<DashboardIcon />}
            label={board?.title}
            onClick={() => {}}/>
        </Tooltip>

        <Chip sx={MENU_STYLES}
          icon={<VpnLockIcon />}
          label={capitalizeFirstLetter(board?.type)}
          onClick={() => {}}/>
        <Chip sx={MENU_STYLES}
          icon={<AddToDriveIcon />}
          label="Add To Google Drive"
          onClick={() => {}}/>
        <Chip sx={MENU_STYLES}
          icon={<BoltIcon />}
          label="Automatin"
          onClick={() => {}}/>
        <Chip sx={MENU_STYLES}
          icon={<DeleteForeverIcon />}
          label="Delete Board"
          onClick={handleDeleteBoard}/>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <InviteBoardUser boardId={board._id}/>
        <BoardUserGroup boardUsers={board?.FE_allUsers}/>
      </Box>
    </Box>
  )
}

export default BoardBar
